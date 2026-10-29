import { ATTENDANCE_STATUS, PUNCH_TYPE, SYNC_STATUS, REJECTION_REASONS } from '../constants/attendance';

export type AttendanceStatusType = keyof typeof ATTENDANCE_STATUS;
export type PunchType = keyof typeof PUNCH_TYPE;
export type SyncStatusType = keyof typeof SYNC_STATUS;
export type RejectionReasonType = keyof typeof REJECTION_REASONS;

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  employeeCode: string;
  punchType: PunchType;
  timestamp: string; // ISO string
  status: AttendanceStatusType;
  verificationStatus?: 'verified' | 'failed' | 'pending';
  
  // Geolocation metadata
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number;
  distanceFromCampusMeters: number;
  isInsideGeofence: boolean;

  // Verification metadata
  verificationId: string;
  livenessScore: number;
  faceMatchScore: number;
  deviceIntegrityPassed: boolean;

  // Sync state
  syncStatus: SyncStatusType;
  syncAttempts: number;
  syncedAt?: string;
  lastSyncError?: string;
  createdAt: string;
}

export interface AttendanceSummary {
  date: string;
  checkIn?: AttendanceRecord;
  checkOut?: AttendanceRecord;
  totalWorkingHours?: string;
  status: AttendanceStatusType;
}

export interface AttendanceStats {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leavesTaken: number;
  attendancePercentage: number;
  currentStreakDays: number;
}
