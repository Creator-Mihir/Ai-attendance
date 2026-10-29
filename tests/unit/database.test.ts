import db from '../../src/database/database';
import { runMigrations, resetDatabase, SEED_TEACHER } from '../../src/database/migrations';
import { TeacherRepository } from '../../src/database/repositories/teacher.repository';
import { AttendanceRepository } from '../../src/database/repositories/attendance.repository';
import { VerificationRepository } from '../../src/database/repositories/verification.repository';
import { SyncRepository } from '../../src/database/repositories/sync.repository';
import { AttendanceRecord } from '../../src/types/attendance';
import { VerificationResult } from '../../src/types/verification';
import { SyncQueueItem } from '../../src/types/sync';

export async function runDatabaseTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      failed++;
      errors.push(`Assertion failed: ${testName}`);
      console.error(`  ✗ ${testName}`);
    }
  }

  console.log('\n--- STARTING PHASE 2 LOCAL DATABASE TESTS ---');

  try {
    // 1. Reset and Run Migrations
    console.log('\n[1] Testing Migrations & Schema Initialization...');
    await resetDatabase();
    assert(true, 'Database reset and migrations completed without errors');

    // 2. Teacher Repository Tests
    console.log('\n[2] Testing TeacherRepository...');
    const seeded = await TeacherRepository.getCurrentTeacher();
    assert(seeded !== null, 'Current teacher was seeded and retrieved');
    assert(seeded?.employeeCode === SEED_TEACHER.employeeCode, 'Seeded teacher has correct employeeCode');

    const byId = await TeacherRepository.getById(SEED_TEACHER.id);
    assert(byId !== null && byId.fullName === SEED_TEACHER.fullName, 'Retrieved teacher by ID');

    const byCode = await TeacherRepository.getByEmployeeCode('tch-1042');
    assert(byCode !== null && byCode.id === SEED_TEACHER.id, 'Retrieved teacher by case-insensitive employee code');

    // Test creating a new teacher
    const testTeacher = {
      ...SEED_TEACHER,
      id: 'tch-test-custom-1',
      employeeCode: 'TCH-9999',
      fullName: 'Prof. Alan Turing',
      department: 'Mathematics',
    };
    await TeacherRepository.save(testTeacher);
    const retrievedCustom = await TeacherRepository.getById('tch-test-custom-1');
    assert(retrievedCustom !== null && retrievedCustom.fullName === 'Prof. Alan Turing', 'Saved and fetched custom teacher');

    const teacherCount = await TeacherRepository.count();
    assert(teacherCount >= 2, `Teacher count is at least 2 (found ${teacherCount})`);

    // 3. Attendance Repository Tests
    console.log('\n[3] Testing AttendanceRepository...');
    const allAttendance = await AttendanceRepository.getAll();
    assert(allAttendance.length > 0, `Historical attendance records were loaded (found ${allAttendance.length})`);

    const teacherAtt = await AttendanceRepository.getByTeacherId(SEED_TEACHER.id);
    assert(teacherAtt.length > 0, 'Fetched attendance logs by teacherId');

    const stats = await AttendanceRepository.getStats(SEED_TEACHER.id);
    assert(stats.presentDays >= 0 && stats.attendancePercentage >= 0, 'Generated attendance stats from SQLite');
    assert(stats.attendancePercentage >= 0 && stats.attendancePercentage <= 100, 'Attendance percentage is valid');

    const summaries = await AttendanceRepository.getDailySummaries(SEED_TEACHER.id);
    assert(summaries.length > 0, `Generated daily attendance summaries (found ${summaries.length})`);

    // Create a new attendance punch
    const nowIso = new Date().toISOString();
    const newRecord: AttendanceRecord = {
      id: 'att_test_unit_1',
      teacherId: SEED_TEACHER.id,
      employeeCode: SEED_TEACHER.employeeCode,
      punchType: 'CHECK_IN',
      timestamp: nowIso,
      status: 'PRESENT',
      latitude: 23.217778,
      longitude: 77.408611,
      gpsAccuracyMeters: 4.0,
      distanceFromCampusMeters: 10,
      isInsideGeofence: true,
      verificationId: 'ver_test_unit_1',
      livenessScore: 0.99,
      faceMatchScore: 0.98,
      deviceIntegrityPassed: true,
      syncStatus: 'PENDING',
      syncAttempts: 0,
      createdAt: nowIso,
    };
    await AttendanceRepository.save(newRecord);
    const fetchedNew = await AttendanceRepository.getById('att_test_unit_1');
    assert(fetchedNew !== null && fetchedNew.punchType === 'CHECK_IN', 'Created and retrieved new attendance log');

    // Update sync status
    await AttendanceRepository.updateSyncStatus('att_test_unit_1', 'SYNCED');
    const syncedRec = await AttendanceRepository.getById('att_test_unit_1');
    assert(syncedRec?.syncStatus === 'SYNCED', 'Updated attendance record syncStatus to SYNCED');

    // 4. Verification Repository Tests
    console.log('\n[4] Testing VerificationRepository...');
    const testVerification: VerificationResult = {
      id: 'ver_unit_999',
      passed: true,
      livenessPassed: true,
      livenessScore: 0.97,
      faceMatchPassed: true,
      faceMatchScore: 0.95,
      geofencePassed: true,
      deviceIntegrityPassed: true,
      timestamp: new Date().toISOString(),
    };
    await VerificationRepository.save(testVerification, 'att_test_unit_1', 'initial', SEED_TEACHER.id);
    const fetchedVer = await VerificationRepository.getById('ver_unit_999');
    assert(fetchedVer !== null && fetchedVer.passed === true, 'Saved and retrieved verification record');

    const verCount = await VerificationRepository.count();
    assert(verCount > 0, `Verification count is greater than 0 (found ${verCount})`);

    // 5. Sync Queue Repository Tests
    console.log('\n[5] Testing SyncRepository & Sync Queue...');
    const testQueueItem: SyncQueueItem = {
      id: 'sync_test_item_1',
      entityType: 'ATTENDANCE',
      entityId: newRecord.id,
      payload: newRecord,
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: 5,
      createdAt: new Date().toISOString(),
    };
    await SyncRepository.enqueue(testQueueItem);
    const pendingList = await SyncRepository.getPending();
    const foundPending = pendingList.find(i => i.id === 'sync_test_item_1');
    assert(foundPending !== undefined, 'Enqueued item into Sync Queue and retrieved from pending');

    await SyncRepository.updateStatus('sync_test_item_1', 'SYNCED');
    const updatedItem = await SyncRepository.getById('sync_test_item_1');
    assert(updatedItem?.status === 'SYNCED', 'Updated sync queue item status to SYNCED');

    await SyncRepository.clearCompleted();
    const afterClear = await SyncRepository.getById('sync_test_item_1');
    assert(afterClear === null, 'Completed synced items cleared from queue');

    // Cleanup custom test teacher
    await TeacherRepository.delete('tch-test-custom-1');
    const cleanedTeacher = await TeacherRepository.getById('tch-test-custom-1');
    assert(cleanedTeacher === null, 'Cleaned up test teacher');

  } catch (err: any) {
    failed++;
    errors.push(`Unexpected error: ${err.message || String(err)}`);
    console.error('Test execution error:', err);
  }

  console.log(`\n--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  return { passed, failed, errors };
}

export default runDatabaseTests;

// Auto-run when executed directly
runDatabaseTests().then((result) => {
  if (result.failed > 0) {
    console.error('\nFailing database tests:');
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  process.exit(0);
});
