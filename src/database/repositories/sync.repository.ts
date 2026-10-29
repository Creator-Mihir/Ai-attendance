import db from '../database';
import { SyncQueueItem, SyncItemStatus } from '../../types/sync';

function mapRowToSyncItem(row: any): SyncQueueItem {
  let parsedPayload: any = row.payload;
  if (typeof row.payload === 'string') {
    try {
      parsedPayload = JSON.parse(row.payload);
    } catch {
      parsedPayload = row.payload;
    }
  }
  return {
    id: row.id,
    entityType: row.entity_type as any,
    entityId: row.entity_id,
    payload: parsedPayload,
    status: (row.status || 'QUEUED').toUpperCase() as SyncItemStatus,
    retryCount: Number(row.retry_count || 0),
    maxRetries: Number(row.max_retries || 5),
    lastAttemptAt: row.last_attempt_at || undefined,
    errorMessage: row.error_message || undefined,
    createdAt: row.created_at,
  };
}

export class SyncRepository {
  public static async getQueue(): Promise<SyncQueueItem[]> {
    const rows = await db.getAllAsync('SELECT * FROM sync_queue ORDER BY created_at ASC;');
    return rows.map(mapRowToSyncItem);
  }

  public static async getById(id: string): Promise<SyncQueueItem | null> {
    const row = await db.getFirstAsync('SELECT * FROM sync_queue WHERE id = ? LIMIT 1;', [id]);
    return row ? mapRowToSyncItem(row) : null;
  }

  public static async enqueue(item: SyncQueueItem): Promise<void> {
    // If an item for this entity is already pending/queued, replace it
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM sync_queue WHERE entity_id = ? AND (UPPER(status) = 'QUEUED' OR UPPER(status) = 'PENDING') LIMIT 1;",
      [item.entityId]
    );

    const targetId = existing ? existing.id : item.id;
    const payloadStr = typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload);
    const status = (item.status || 'QUEUED').toUpperCase();

    await db.runAsync(
      `INSERT INTO sync_queue (
        id, entity_type, entity_id, operation, payload, status, retry_count,
        max_retries, last_attempt_at, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        status = excluded.status,
        retry_count = excluded.retry_count,
        last_attempt_at = excluded.last_attempt_at,
        error_message = excluded.error_message;`,
      [
        targetId,
        item.entityType,
        item.entityId,
        'CREATE',
        payloadStr,
        status,
        item.retryCount || 0,
        item.maxRetries || 5,
        item.lastAttemptAt || null,
        item.errorMessage || null,
        item.createdAt,
      ]
    );
  }

  public static async updateItem(item: SyncQueueItem): Promise<void> {
    const payloadStr = typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload);
    const status = (item.status || 'QUEUED').toUpperCase();

    await db.runAsync(
      `UPDATE sync_queue
       SET payload = ?,
           status = ?,
           retry_count = ?,
           last_attempt_at = ?,
           error_message = ?
       WHERE id = ?;`,
      [
        payloadStr,
        status,
        item.retryCount || 0,
        item.lastAttemptAt || null,
        item.errorMessage || null,
        item.id,
      ]
    );
  }

  public static async updateStatus(id: string, status: SyncItemStatus, error?: string): Promise<void> {
    const normalized = status.toUpperCase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE sync_queue
       SET status = ?,
           last_attempt_at = ?,
           error_message = COALESCE(?, error_message),
           retry_count = CASE WHEN ? = 'FAILED' THEN retry_count + 1 ELSE retry_count END
       WHERE id = ?;`,
      [normalized, now, error || null, normalized, id]
    );
  }

  public static async remove(id: string): Promise<void> {
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?;', [id]);
  }

  public static async getPending(): Promise<SyncQueueItem[]> {
    const rows = await db.getAllAsync(
      "SELECT * FROM sync_queue WHERE UPPER(status) = 'QUEUED' OR UPPER(status) = 'FAILED' OR UPPER(status) = 'PENDING' ORDER BY created_at ASC;"
    );
    return rows.map(mapRowToSyncItem);
  }

  public static async getPendingCount(): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sync_queue WHERE UPPER(status) = 'QUEUED' OR UPPER(status) = 'FAILED' OR UPPER(status) = 'PENDING';"
    );
    return row ? Number(row.count) : 0;
  }

  public static async resetFailedToQueued(): Promise<number> {
    const res = await db.runAsync(
      "UPDATE sync_queue SET status = 'QUEUED', retry_count = 0, error_message = NULL WHERE UPPER(status) = 'FAILED';"
    );
    try {
      await db.runAsync(
        "UPDATE attendance_logs SET sync_status = 'PENDING', last_sync_error = NULL WHERE UPPER(sync_status) = 'FAILED';"
      );
    } catch {}
    return res.changes || 0;
  }

  public static async clearCompleted(): Promise<void> {
    await db.runAsync("DELETE FROM sync_queue WHERE UPPER(status) = 'SYNCED';");
  }

  public static async clearAll(): Promise<void> {
    await db.runAsync('DELETE FROM sync_queue;');
  }
}

export default SyncRepository;
