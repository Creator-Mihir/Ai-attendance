import { syncManager } from '../sync/sync-manager';
import { SyncQueue } from '../sync/sync-queue';
import { SyncEngineStatus, SyncProcessResult, SyncQueueItem } from '../types/sync';

export class SyncService {
  public static start(): void {
    syncManager.startAutoSync();
  }

  public static stop(): void {
    syncManager.stopAutoSync();
  }

  public static async triggerSyncNow(forceRetryFailed = false): Promise<SyncProcessResult> {
    return syncManager.triggerSync(forceRetryFailed);
  }

  public static async retryFailed(): Promise<number> {
    return syncManager.retryFailed();
  }

  public static async clearSynced(): Promise<void> {
    return syncManager.clearSynced();
  }

  public static async getStatus(): Promise<SyncEngineStatus> {
    return syncManager.getStatus();
  }

  public static async getQueueItems(): Promise<SyncQueueItem[]> {
    return syncManager.getQueueItems();
  }

  public static subscribe(cb: (status: SyncEngineStatus) => void): () => void {
    return syncManager.subscribe(cb);
  }

  public static async getPendingCount(): Promise<number> {
    return SyncQueue.getCount();
  }
}

export default SyncService;
