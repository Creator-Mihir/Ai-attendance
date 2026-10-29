import db from '../database';
import { SCHEMA } from '../schema';
import { TeacherRepository } from '../repositories/teacher.repository';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { SyncRepository } from '../repositories/sync.repository';
import { TeacherProfile } from '../../types/teacher';
import { AttendanceRecord } from '../../types/attendance';
import { SyncQueueItem } from '../../types/sync';
import { AppConfig } from '../../constants/config';

export const SEED_TEACHER: TeacherProfile = {
  id: 'tch-8849-ae12',
  employeeCode: 'TCH-1042',
  fullName: 'Dr. Sarah Mitchell',
  email: 'sarah.mitchell@academy.edu',
  phoneNumber: '+1 (555) 234-5678',
  department: 'Department of Computer Science',
  designation: 'Senior Faculty & Dept Head',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop',
  faceRegistered: true,
  faceEmbedding: {
    version: 'facenet-v4',
    vector: [0.12, -0.45, 0.88, 0.31, -0.05, 0.67],
    anglesCaptured: ['FRONT', 'LEFT', 'RIGHT', 'UP'],
    enrolledAt: '2026-01-15T09:00:00.000Z',
    qualityScore: 0.98,
  },
  enrolledDeviceId: 'DEV-IPHONE-16P',
  schoolBranchId: 'branch-main-01',
  schoolBranchName: 'Metropolitan Science Academy - Main Campus',
  joinedDate: '2021-08-10',
  isActive: true,
};

function generatePastAttendanceSeed(teacher: TeacherProfile): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const campus = AppConfig.schoolCampus;

  // Generate 7 days of attendance history leading up to yesterday
  for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);

    // Skip Sundays
    if (d.getDay() === 0) continue;

    const dateStr = d.toISOString().split('T')[0];

    // Day 2 was slightly late (9:14 AM), other days 8:45 AM
    const isLate = daysAgo === 2;
    const checkInHour = isLate ? '09' : '08';
    const checkInMin = isLate ? '14' : '45';
    const checkInTime = `${dateStr}T${checkInHour}:${checkInMin}:00.000Z`;
    const checkOutTime = `${dateStr}T16:30:00.000Z`;

    // Check In record
    records.push({
      id: `seed_att_in_${daysAgo}`,
      teacherId: teacher.id,
      employeeCode: teacher.employeeCode,
      punchType: 'CHECK_IN',
      timestamp: checkInTime,
      status: isLate ? 'LATE' : 'PRESENT',
      latitude: campus.latitude + 0.0001,
      longitude: campus.longitude + 0.0001,
      gpsAccuracyMeters: 4.2,
      distanceFromCampusMeters: 22,
      isInsideGeofence: true,
      verificationId: `seed_ver_in_${daysAgo}`,
      livenessScore: 0.96,
      faceMatchScore: 0.98,
      deviceIntegrityPassed: true,
      syncStatus: 'SYNCED',
      syncAttempts: 1,
      syncedAt: checkInTime,
      createdAt: checkInTime,
    });

    // Check Out record
    records.push({
      id: `seed_att_out_${daysAgo}`,
      teacherId: teacher.id,
      employeeCode: teacher.employeeCode,
      punchType: 'CHECK_OUT',
      timestamp: checkOutTime,
      status: 'PRESENT',
      latitude: campus.latitude + 0.0002,
      longitude: campus.longitude + 0.0001,
      gpsAccuracyMeters: 5.1,
      distanceFromCampusMeters: 28,
      isInsideGeofence: true,
      verificationId: `seed_ver_out_${daysAgo}`,
      livenessScore: 0.95,
      faceMatchScore: 0.97,
      deviceIntegrityPassed: true,
      syncStatus: 'SYNCED',
      syncAttempts: 1,
      syncedAt: checkOutTime,
      createdAt: checkOutTime,
    });
  }

  return records;
}

export async function runMigrations(includeDemoFixtures = false): Promise<void> {
  // 1. Initialize SQLite Database Engine
  await db.init();

  // 2. Execute table and index schemas
  try {
    for (const tableSql of Object.values(SCHEMA.tables)) {
      await db.execAsync(tableSql);
    }
    for (const indexSql of SCHEMA.indexes) {
      await db.execAsync(indexSql);
    }
  } catch (err) {
    console.warn('[Migrations] Schema verification warning:', err);
  }

  // 3. Check version flag
  const version = await db.get<number>('db_schema_version');
  if (!version || version < SCHEMA.version) {
    await db.set('db_schema_version', SCHEMA.version);
    await db.set('db_migrated_at', new Date().toISOString());
  }

  // Demo fixtures are only loaded when the explicit test helper requests them.
  if (!includeDemoFixtures) return;

  // 4. Seed default teacher if database has no teachers yet
  const teacherCount = await TeacherRepository.count();
  if (teacherCount === 0) {
    await TeacherRepository.save(SEED_TEACHER);
    await TeacherRepository.setCurrentTeacher(SEED_TEACHER.id);
  } else {
    // Ensure current teacher is set
    const current = await TeacherRepository.getCurrentTeacher();
    if (!current) {
      await TeacherRepository.setCurrentTeacher(SEED_TEACHER.id);
    }
  }

  // 5. Seed historical attendance records if empty
  const attendanceCount = await AttendanceRepository.count();
  if (attendanceCount === 0) {
    const pastRecords = generatePastAttendanceSeed(SEED_TEACHER);
    for (const record of pastRecords) {
      await AttendanceRepository.save(record);
    }

    // Also seed a pending attendance item to demonstrate offline sync queue
    const pendingTimestamp = new Date().toISOString();
    const demoPendingRecord: AttendanceRecord = {
      id: 'att_demo_pending_1',
      teacherId: SEED_TEACHER.id,
      employeeCode: SEED_TEACHER.employeeCode,
      punchType: 'CHECK_IN',
      timestamp: pendingTimestamp,
      status: 'PRESENT',
      latitude: AppConfig.schoolCampus.latitude,
      longitude: AppConfig.schoolCampus.longitude,
      gpsAccuracyMeters: 3.5,
      distanceFromCampusMeters: 15,
      isInsideGeofence: true,
      verificationId: 'ver_demo_pending_1',
      livenessScore: 0.98,
      faceMatchScore: 0.99,
      deviceIntegrityPassed: true,
      syncStatus: 'PENDING',
      syncAttempts: 0,
      createdAt: pendingTimestamp,
    };

    // Save locally in SQLite attendance logs
    await AttendanceRepository.save(demoPendingRecord);

    // Enqueue in sync queue
    const queueItem: SyncQueueItem = {
      id: 'sync_demo_pending_1',
      entityType: 'ATTENDANCE',
      entityId: demoPendingRecord.id,
      payload: demoPendingRecord,
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: 5,
      createdAt: pendingTimestamp,
    };
    await SyncRepository.enqueue(queueItem);
  }
}

export async function resetDatabase(): Promise<void> {
  await db.clearAll();
  await runMigrations(true);
}

export default runMigrations;
