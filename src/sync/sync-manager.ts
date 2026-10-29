import { syncEngine } from './sync-engine';
import { SyncQueue } from './sync-queue';
import { AppConfig } from '../constants/config';
import { SyncEngineStatus, SyncProcessResult, SyncQueueItem } from '../types/sync';
import { NetworkService } from '../services/network.service';

export class SyncManager {
  private timer: any = null;
  private isSyncing = false;
  private lastSyncTimestamp: string = new Date().toISOString();
  private listeners: Set<(status: SyncEngineStatus) => void> = new Set();
  private subscriberCount = 0;
  private isInitialized = false;

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // When network reconnects, automatically trigger sync!
    NetworkService.onReconnect(() => {
      this.triggerSync().catch(() => {});
    });

    // Also notify status on network change
    NetworkService.subscribe(() => {
      this.notifyStatus().catch(() => {});
    });
  }

  public startAutoSync(): void {
    this.initialize();
    this.subscriberCount++;

    if (this.timer) return;
    this.timer = setInterval(() => {
      if (NetworkService.isOnline()) {
        this.triggerSync().catch(() => {});
      }
    }, AppConfig.sync.autoSyncIntervalMs);
  }

  public stopAutoSync(): void {
    this.subscriberCount = Math.max(0, this.subscriberCount - 1);
    if (this.subscriberCount === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async triggerSync(forceRetryFailed = false): Promise<SyncProcessResult> {
    if (!NetworkService.isOnline()) {
      return { processed: 0, succeeded: 0, failed: 0, errors: [] };
    }
    if (this.isSyncing) {
      return { processed: 0, succeeded: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;

    try {
      // A user-initiated sync explicitly retries prior failures now; automatic
      // background sync still respects the normal retry backoff.
      if (forceRetryFailed) await SyncQueue.retryAllFailed();
      await this.notifyStatus();
      const result = await syncEngine.processQueue();
      if (result.processed > 0) {
        this.lastSyncTimestamp = new Date().toISOString();
      }
      return result;
    } finally {
      this.isSyncing = false;
      await this.notifyStatus();
    }
  }

  public async retryFailed(): Promise<number> {
    const count = await SyncQueue.retryAllFailed();
    if (count > 0 && NetworkService.isOnline()) {
      this.triggerSync().catch(() => {});
    }
    await this.notifyStatus();
    return count;
  }

  public async clearSynced(): Promise<void> {
    await SyncQueue.clearCompleted();
    await this.notifyStatus();
  }

  public async getQueueItems(): Promise<SyncQueueItem[]> {
    return SyncQueue.getAll();
  }

  public async getStatus(): Promise<SyncEngineStatus> {
    const pendingItems = await SyncQueue.getPending();
    const failedItems = pendingItems.filter((i) => i.status === 'FAILED');

    return {
      isOnline: NetworkService.isOnline(),
      isSyncing: this.isSyncing,
      pendingCount: pendingItems.length,
      failedCount: failedItems.length,
      lastSyncTimestamp: this.lastSyncTimestamp,
    };
  }

  public subscribe(cb: (status: SyncEngineStatus) => void): () => void {
    this.initialize();
    this.listeners.add(cb);
    this.getStatus().then(cb).catch(() => {});

    return () => {
      this.listeners.delete(cb);
    };
  }

  private async notifyStatus(): Promise<void> {
    const status = await this.getStatus();
    this.listeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.error('SyncManager listener error:', err);
      }
    });
  }
}

export const syncManager = new SyncManager();
syncManager.initialize();

export default syncManager;
