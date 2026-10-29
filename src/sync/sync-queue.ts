import { SyncRepository } from '../database/repositories/sync.repository';
import { SyncQueueItem } from '../types/sync';
import { AttendanceRecord } from '../types/attendance';
import { VerificationResult } from '../types/verification';
import { TeacherProfile } from '../types/teacher';

export class SyncQueue {
  public static async pushTeacher(teacher: TeacherProfile): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: 'sync_tch_' + Math.random().toString(36).substring(2, 9),
      entityType: 'PROFILE_UPDATE',
      entityId: teacher.id,
      payload: teacher,
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: 5,
      createdAt: new Date().toISOString(),
    };
    await SyncRepository.enqueue(item);
    return item;
  }

  public static async pushAttendance(record: AttendanceRecord): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: 'sync_att_' + Math.random().toString(36).substring(2, 9),
      entityType: 'ATTENDANCE',
      entityId: record.id,
      payload: record,
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: 5,
      createdAt: new Date().toISOString(),
    };
    await SyncRepository.enqueue(item);
    return item;
  }

  public static async pushVerification(
    record: VerificationResult,
    teacherId: string,
    attendanceId?: string
  ): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: 'sync_ver_' + Math.random().toString(36).substring(2, 9),
      entityType: 'VERIFICATION',
      entityId: record.id,
      payload: {
        ...record,
        teacherId,
        attendanceId,
      },
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: 5,
      createdAt: new Date().toISOString(),
    };
    await SyncRepository.enqueue(item);
    return item;
  }

  public static async getPending(): Promise<SyncQueueItem[]> {
    return SyncRepository.getPending();
  }

  public static async getAll(): Promise<SyncQueueItem[]> {
    return SyncRepository.getQueue();
  }

  public static async markSyncing(id: string): Promise<void> {
    await SyncRepository.updateStatus(id, 'SYNCING');
  }

  public static async markSuccess(id: string): Promise<void> {
    await SyncRepository.updateStatus(id, 'SYNCED');
  }

  public static async markFailure(id: string, errorMessage: string): Promise<void> {
    await SyncRepository.updateStatus(id, 'FAILED', errorMessage);
  }

  public static async retryAllFailed(): Promise<number> {
    return SyncRepository.resetFailedToQueued();
  }

  public static async clearCompleted(): Promise<void> {
    await SyncRepository.clearCompleted();
  }

  public static async clearAll(): Promise<void> {
    await SyncRepository.clearAll();
  }

  public static async getCount(): Promise<number> {
    return SyncRepository.getPendingCount();
  }
}

export default SyncQueue;
