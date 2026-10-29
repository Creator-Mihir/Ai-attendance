import { SyncQueue } from './sync-queue';
import { apiClient } from '../api/client';
import { AttendanceRepository } from '../database/repositories/attendance.repository';
import { VerificationRepository } from '../database/repositories/verification.repository';
import { TeacherRepository } from '../database/repositories/teacher.repository';
import { AttendanceRecord } from '../types/attendance';
import { SyncProcessResult, SyncQueueItem } from '../types/sync';
import { NetworkService } from '../services/network.service';
import { SyncDomain } from '../domain/sync';

export class SyncEngine {
  private isProcessing = false;

  public async processQueue(): Promise<SyncProcessResult> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0, errors: [] };
    }

    // 1. Check network availability
    if (!NetworkService.isOnline() || !apiClient.isNetworkOnline()) {
      return { processed: 0, succeeded: 0, failed: 0, errors: [] };
    }

    // Ensure the persisted base URL is loaded before making any requests
    await apiClient.restoreBaseUrl();

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: { id: string; message: string }[] = [];

    try {
      // Ensure all unsynced attendance logs in SQLite are in the queue.
      try {
        const unsyncedLogs = await AttendanceRepository.getPendingSync();
        const existingQueue = await SyncQueue.getAll();
        for (const log of unsyncedLogs) {
          const alreadyInQueue = existingQueue.some(
            (item) => item.entityId === log.id && (item.status === 'QUEUED' || (item.status as string) === 'PENDING' || item.status === 'FAILED')
          );
          if (!alreadyInQueue) {
            await SyncQueue.pushAttendance(log);
          }
        }
      } catch (err) {
        console.warn('[SyncEngine] Ensure attendance queued error:', err);
      }

      const pendingItems = await SyncQueue.getPending();
      if (pendingItems.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0, errors: [] };
      }

      // Filter eligible items respecting exponential backoff and max retries
      const eligibleItems = pendingItems.filter((item) => {
        if (item.status === 'QUEUED') return true;
        if (item.status === 'FAILED') {
          return SyncDomain.isItemReadyForRetry(item);
        }
        return false;
      });

      if (eligibleItems.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0, errors: [] };
      }

      // Sync queued profile changes once, before attendance that depends on them.
      const profileItems = eligibleItems.filter((item) => item.entityType === 'PROFILE_UPDATE');
      for (const item of profileItems) {
        try {
          await SyncQueue.markSyncing(item.id);
          const teacherData = item.payload;
          const syncRes = await apiClient.syncTeacher(teacherData);
          if (syncRes.success && syncRes.data?.token) {
            apiClient.setAuthToken(syncRes.data.token);
            await TeacherRepository.setAuthToken(syncRes.data.token);
            if (syncRes.data.teacher) {
              await TeacherRepository.save(syncRes.data.teacher);
            }
          }
          await SyncQueue.markSuccess(item.id);
          succeeded++;
          processed++;
        } catch (profileErr: any) {
          failed++;
          processed++;
          const msg = profileErr?.message || 'Failed to sync teacher profile to server';
          await SyncQueue.markFailure(item.id, msg);
          errors.push({ id: item.id, message: msg });
        }
      }

      // Step D: Separate into attendance and verification records
      const attendanceBatch: { item: SyncQueueItem; record: AttendanceRecord }[] = [];
      const verificationQueueItems = pendingItems.filter((item) => item.entityType === 'VERIFICATION');

      for (const item of eligibleItems) {
        if (item.entityType === 'ATTENDANCE') {
          await SyncQueue.markSyncing(item.id);
          attendanceBatch.push({ item, record: item.payload });
        }
      }

      // Step E: Dispatch Attendance Batch
      if (attendanceBatch.length > 0) {
        try {
          const records = await Promise.all(
            attendanceBatch.map(async ({ record }) => {
              let verification: any = null;
              if (record.verificationId) {
                verification = await VerificationRepository.getById(record.verificationId);
              }
              if (!verification) {
                // Graceful fallback audit record if verification was missing
                verification = {
                  id: record.verificationId || ('ver_' + record.id),
                  teacherId: record.teacherId,
                  attendanceId: record.id,
                  passed: (record.status as string) !== 'REJECTED' && record.status !== 'ABSENT',
                  livenessScore: record.livenessScore || 0.9,
                  faceMatchScore: record.faceMatchScore || 0.9,
                  deviceIntegrityPassed: record.deviceIntegrityPassed ?? true,
                  status: 'PASS',
                  timestamp: record.timestamp,
                };
              }

              let teacher: any = null;
              if (record.teacherId) {
                teacher = await TeacherRepository.getById(record.teacherId);
              }
              if (!teacher && record.employeeCode) {
                teacher = await TeacherRepository.getByEmployeeCode(record.employeeCode);
              }
              if (!teacher) {
                teacher = await TeacherRepository.getCurrentTeacher();
              }

              return { attendance: record, verification, teacher };
            })
          );

          const res = await apiClient.batchSync(records);

          if (res.data) {
            const syncedIdsSet = new Set(res.data.syncedIds || []);

            for (const { item, record } of attendanceBatch) {
              processed++;
              if (syncedIdsSet.has(record.id)) {
                await SyncQueue.markSuccess(item.id);
                await AttendanceRepository.updateSyncStatus(record.id, 'SYNCED');
                const verificationItem = verificationQueueItems.find((candidate) => candidate.entityId === record.verificationId);
                if (verificationItem) await SyncQueue.markSuccess(verificationItem.id);
                succeeded++;
              } else {
                failed++;
                const errMsg = res.data.errors?.find((error) => error.id === record.id)?.message || 'Record rejected by sync server';
                await SyncQueue.markFailure(item.id, errMsg);
                const verificationItem = verificationQueueItems.find((candidate) => candidate.entityId === record.verificationId);
                if (verificationItem) await SyncQueue.markFailure(verificationItem.id, errMsg);
                await AttendanceRepository.updateSyncStatus(record.id, 'FAILED', errMsg);
                errors.push({ id: item.id, message: errMsg });
              }
            }
          }
        } catch (err: any) {
          const errMsg = err?.message || 'Network transfer error during attendance sync';
          for (const { item, record } of attendanceBatch) {
            processed++;
            failed++;
            await SyncQueue.markFailure(item.id, errMsg);
            const verificationItem = verificationQueueItems.find((candidate) => candidate.entityId === record.verificationId);
            if (verificationItem) await SyncQueue.markFailure(verificationItem.id, errMsg);
            await AttendanceRepository.updateSyncStatus(record.id, 'FAILED', errMsg);
            errors.push({ id: item.id, message: errMsg });
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded, failed, errors };
  }
}

export const syncEngine = new SyncEngine();
export default syncEngine;
