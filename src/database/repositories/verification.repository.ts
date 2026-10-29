import db from '../database';
import { VerificationResult, RejectionReason } from '../../types/verification';

function mapRowToVerification(row: any): VerificationResult {
  let auditMeta = undefined;
  if (row.meta_json) {
    try {
      auditMeta = JSON.parse(row.meta_json);
    } catch {}
  }

  return {
    id: row.id,
    passed: row.status === 'passed' || row.status === 'PASSED',
    rejectionReason: (row.rejection_reason as RejectionReason) || undefined,
    rejectionMessage: row.rejection_message || undefined,
    livenessPassed: Boolean(row.liveness_passed),
    livenessScore: Number(row.liveness_score || 0),
    faceMatchPassed: Boolean(row.face_match_passed),
    faceMatchScore: Number(row.face_match_score || 0),
    geofencePassed: Boolean(row.location_verified),
    deviceIntegrityPassed: Boolean(row.device_verified),
    checks: auditMeta?.checks,
    timestamp: row.timestamp,
    auditMeta,
  };
}

export class VerificationRepository {
  public static async getAll(limit = 100): Promise<VerificationResult[]> {
    const rows = await db.getAllAsync(
      'SELECT * FROM verification_records ORDER BY timestamp DESC LIMIT ?;',
      [limit]
    );
    return rows.map(mapRowToVerification);
  }

  public static async getById(id: string): Promise<VerificationResult | null> {
    const row = await db.getFirstAsync(
      'SELECT * FROM verification_records WHERE id = ? LIMIT 1;',
      [id]
    );
    return row ? mapRowToVerification(row) : null;
  }

  public static async getByAttendanceId(attendanceId: string): Promise<VerificationResult[]> {
    const rows = await db.getAllAsync(
      'SELECT * FROM verification_records WHERE attendance_id = ? ORDER BY timestamp DESC;',
      [attendanceId]
    );
    return rows.map(mapRowToVerification);
  }

  public static async getByTeacherId(teacherId: string): Promise<VerificationResult[]> {
    const rows = await db.getAllAsync(
      'SELECT * FROM verification_records WHERE teacher_id = ? ORDER BY timestamp DESC;',
      [teacherId]
    );
    return rows.map(mapRowToVerification);
  }

  public static async create(
    record: VerificationResult,
    options?: { attendanceId?: string; type?: 'initial' | 'random' | 'exit'; teacherId?: string }
  ): Promise<void> {
    return this.save(record, options?.attendanceId, options?.type, options?.teacherId);
  }

  public static async save(
    record: VerificationResult,
    attendanceId?: string,
    type: 'initial' | 'random' | 'exit' = 'initial',
    teacherId: string = 'default_teacher'
  ): Promise<void> {
    const status = record.passed ? 'passed' : 'failed';

    await db.runAsync(
      `INSERT INTO verification_records (
        id, attendance_id, teacher_id, type, liveness_score, face_match_score,
        location_verified, device_verified, liveness_passed, face_match_passed,
        status, rejection_reason, rejection_message, timestamp, meta_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        rejection_reason = excluded.rejection_reason,
        rejection_message = excluded.rejection_message,
        liveness_score = excluded.liveness_score,
        face_match_score = excluded.face_match_score;`,
      [
        record.id,
        attendanceId || null,
        teacherId,
        type,
        record.livenessScore,
        record.faceMatchScore,
        record.geofencePassed ? 1 : 0,
        record.deviceIntegrityPassed ? 1 : 0,
        record.livenessPassed ? 1 : 0,
        record.faceMatchPassed ? 1 : 0,
        status,
        record.rejectionReason || null,
        record.rejectionMessage || null,
        record.timestamp,
        record.auditMeta ? JSON.stringify(record.auditMeta) : null,
      ]
    );
  }

  public static async delete(id: string): Promise<void> {
    await db.runAsync('DELETE FROM verification_records WHERE id = ?;', [id]);
  }

  public static async count(): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM verification_records;');
    return row ? Number(row.count) : 0;
  }
}

export default VerificationRepository;
