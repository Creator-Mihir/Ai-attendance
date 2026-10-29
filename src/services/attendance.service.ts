import { AttendanceRecord, PunchType, AttendanceSummary, AttendanceStats } from '../types/attendance';
import { TeacherProfile } from '../types/teacher';
import { LocationVerificationResult } from '../types/location';
import { VerificationResult } from '../types/verification';
import { AttendanceRepository } from '../database/repositories/attendance.repository';
import { SyncQueue } from '../sync/sync-queue';
import { syncManager } from '../sync/sync-manager';
import { AttendanceEntity } from '../domain/attendance';
import { NetworkService } from './network.service';
import { VerificationService } from './verification.service';

export interface MarkAttendanceResult {
  success: boolean;
  record?: AttendanceRecord;
  rejectionReason?: string;
  rejectionMessage?: string;
}

export class AttendanceService {
  /**
   * Records attendance locally into SQLite database.
   * Completely offline-first: persists locally and queues for sync.
   */
  public static async markAttendance(params: {
    teacher: TeacherProfile;
    punchType: PunchType;
    locationResult: LocationVerificationResult;
    verificationResult: VerificationResult;
  }): Promise<MarkAttendanceResult> {
    const { teacher, punchType, locationResult, verificationResult } = params;

    if (!VerificationService.isApprovedPipelineResult(verificationResult)) {
      return {
        success: false,
        rejectionReason: verificationResult?.rejectionReason || 'VERIFICATION_UNAVAILABLE',
        rejectionMessage: verificationResult?.rejectionMessage || 'Attendance is blocked because this result was not issued by the evidence verification pipeline.',
      };
    }
    if (
      !locationResult || !locationResult.isInside || !locationResult.accuracyAcceptable ||
      locationResult.isMockedLocation ||
      !Number.isFinite(locationResult.coordinates?.latitude) ||
      !Number.isFinite(locationResult.coordinates?.longitude) ||
      !Number.isFinite(locationResult.coordinates?.accuracy)
    ) {
      return {
        success: false,
        rejectionReason: 'OUTSIDE_GEOFENCE',
        rejectionMessage: 'Attendance requires a current, accurate, non-mocked location inside the campus geofence.',
      };
    }

    // 1. Check existing punch eligibility from local SQLite
    const existingPunches = await AttendanceRepository.getTodayRecord(teacher.id);
    const eligibility = AttendanceEntity.canPunch(punchType, existingPunches);
    if (!eligibility.allowed) {
      return {
        success: false,
        rejectionReason: 'PUNCH_NOT_ALLOWED',
        rejectionMessage: eligibility.reason || 'Punch not allowed for today.',
      };
    }

    // 2. Validate multi-factor verification pass
    // 3. Local Business Status Determination (PRESENT or LATE)
    const timestamp = new Date().toISOString();
    const status = AttendanceEntity.determineStatus(punchType, timestamp);

    // 4. Construct local attendance record
    const record: AttendanceRecord = {
      id: 'att_' + Math.random().toString(36).substring(2, 9),
      teacherId: teacher.id,
      employeeCode: teacher.employeeCode,
      punchType,
      timestamp,
      status,
      verificationStatus: verificationResult.passed ? 'verified' : 'failed',
      latitude: locationResult.coordinates.latitude,
      longitude: locationResult.coordinates.longitude,
      gpsAccuracyMeters: locationResult.coordinates.accuracy,
      distanceFromCampusMeters: locationResult.distanceMeters,
      isInsideGeofence: locationResult.isInside,
      verificationId: verificationResult.id,
      livenessScore: verificationResult.livenessScore,
      faceMatchScore: verificationResult.faceMatchScore,
      deviceIntegrityPassed: verificationResult.deviceIntegrityPassed,
      syncStatus: 'PENDING',
      syncAttempts: 0,
      createdAt: timestamp,
    };

    // 5. Save locally in SQLite persistent database
    await AttendanceRepository.save(record);

    // 6. Push to Sync Queue
    await SyncQueue.pushAttendance(record);

    // 7. If online, immediately process the queued attendance plus its audit receipt.
    if (NetworkService.isOnline()) {
      syncManager.triggerSync().catch(() => {});
    }

    return {
      success: true,
      record,
    };
  }

  public static async getTodayStatus(teacherId: string, employeeCode?: string) {
    if (NetworkService.isOnline()) {
      try {
        const { apiClient } = await import('../api/client');
        const res = await apiClient.getTodayAttendance(teacherId, employeeCode);
        if (res.success && res.data) {
          if (res.data.checkIn) await AttendanceRepository.save(res.data.checkIn);
          if (res.data.checkOut) await AttendanceRepository.save(res.data.checkOut);
          return res.data;
        }
      } catch (e) {
        console.warn('[AttendanceService] getTodayStatus backend query failed, falling back to local SQLite:', e);
      }
    }
    return AttendanceRepository.getTodayRecord(teacherId);
  }

  public static async getDailySummaries(teacherId?: string, employeeCode?: string): Promise<AttendanceSummary[]> {
    if (!teacherId) return [];
    if (NetworkService.isOnline()) {
      try {
        const { apiClient } = await import('../api/client');
        const res = await apiClient.getAttendanceHistory(teacherId, employeeCode);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          for (const rec of res.data) {
            await AttendanceRepository.save(rec);
          }
        }
      } catch (e) {
        console.warn('[AttendanceService] getDailySummaries backend query failed, using local SQLite:', e);
      }
    }
    return AttendanceRepository.getDailySummaries(teacherId);
  }

  public static async getStats(teacherId: string): Promise<AttendanceStats> {
    return AttendanceRepository.getStats(teacherId);
  }

  public static async getPendingSync(): Promise<AttendanceRecord[]> {
    return AttendanceRepository.getPendingSync();
  }
}

export default AttendanceService;
