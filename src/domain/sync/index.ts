import { SyncQueueItem } from '../../types/sync';
import { AppConfig } from '../../constants/config';

export class SyncDomain {
  public static calculateBackoff(retryCount: number): number {
    return Math.min(60000, AppConfig.sync.backoffBaseMs * Math.pow(2, retryCount));
  }

  public static isItemReadyForRetry(item: SyncQueueItem): boolean {
    if (item.retryCount >= item.maxRetries) return false;
    if (!item.lastAttemptAt) return true;
    const elapsed = Date.now() - new Date(item.lastAttemptAt).getTime();
    return elapsed >= this.calculateBackoff(item.retryCount);
  }
}
