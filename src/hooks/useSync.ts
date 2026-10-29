import { useState, useEffect, useCallback } from 'react';
import { SyncService } from '../services/sync.service';
import { SyncEngineStatus, SyncProcessResult, SyncQueueItem } from '../types/sync';

export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncTimestamp: new Date().toISOString(),
  });

  useEffect(() => {
    SyncService.start();
    const unsub = SyncService.subscribe((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsub();
      SyncService.stop();
    };
  }, []);

  const triggerSync = useCallback(async (forceRetryFailed = false): Promise<SyncProcessResult> => {
    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      return await SyncService.triggerSyncNow(forceRetryFailed);
    } finally {
      const updated = await SyncService.getStatus();
      setSyncStatus(updated);
    }
  }, []);

  const retryFailed = useCallback(async (): Promise<number> => {
    const count = await SyncService.retryFailed();
    const updated = await SyncService.getStatus();
    setSyncStatus(updated);
    return count;
  }, []);

  const clearSynced = useCallback(async (): Promise<void> => {
    await SyncService.clearSynced();
    const updated = await SyncService.getStatus();
    setSyncStatus(updated);
  }, []);

  const getQueueItems = useCallback(async (): Promise<SyncQueueItem[]> => {
    return SyncService.getQueueItems();
  }, []);

  const refresh = useCallback(async (): Promise<SyncEngineStatus> => {
    const updated = await SyncService.getStatus();
    setSyncStatus(updated);
    return updated;
  }, []);

  return {
    ...syncStatus,
    triggerSync,
    retryFailed,
    clearSynced,
    getQueueItems,
    refresh,
  };
}

export default useSync;
