import { AttendanceRecord } from './attendance';

export type SyncItemStatus = 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface SyncQueueItem {
  id: string;
  entityType: 'ATTENDANCE' | 'VERIFICATION' | 'PROFILE_UPDATE';
  entityId: string;
  payload: AttendanceRecord | any;
  status: SyncItemStatus;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface SyncEngineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTimestamp?: string;
  failedCount: number;
}

export interface NetworkConnectionInfo {
  isOnline: boolean;
  isInternetReachable: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown';
  lastChangedAt: string;
}

export interface SyncProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: { id: string; message: string }[];
}

export interface BatchSyncResponse {
  success: boolean;
  syncedIds: string[];
  failedIds: string[];
  errors: { id: string; message: string }[];
}
