import db from '../../src/database/database';
import { resetDatabase, SEED_TEACHER } from '../../src/database/migrations';
import { NetworkService } from '../../src/services/network.service';
import { AttendanceService } from '../../src/services/attendance.service';
import { VerificationService } from '../../src/services/verification.service';
import { SyncQueue } from '../../src/sync/sync-queue';
import { syncEngine } from '../../src/sync/sync-engine';
import { syncManager } from '../../src/sync/sync-manager';
import { TeacherRepository } from '../../src/database/repositories/teacher.repository';
import { AttendanceRepository } from '../../src/database/repositories/attendance.repository';
import { VerificationRepository } from '../../src/database/repositories/verification.repository';
import { SyncRepository } from '../../src/database/repositories/sync.repository';
import { useVerificationStore } from '../../src/store/verification.store';
import { LocationVerificationResult } from '../../src/types/location';
import { VerificationResult } from '../../src/types/verification';

export async function runOfflineSyncTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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

  console.log('\n--- STARTING PHASE 3 OFFLINE LOGIC & SYNC TESTS ---');

  try {
    // 0. Prepare clean database state
    await resetDatabase();

    // -------------------------------------------------------------
    // Test 1: Offline Detection & Network State Transitions
    // -------------------------------------------------------------
    console.log('\n[1] Testing Offline Detection & Network State...');
    NetworkService.setOnline(true);
    assert(NetworkService.isOnline() === true, 'NetworkService reports online state');

    let listenerFired = false;
    let receivedOnlineState = false;
    const unsub = NetworkService.subscribe((info) => {
      listenerFired = true;
      receivedOnlineState = info.isOnline;
    });

    NetworkService.setOnline(false);
    assert(NetworkService.isOnline() === false, 'NetworkService switched to offline mode');
    assert(listenerFired && receivedOnlineState === false, 'Network listener received offline state event');

    const connInfo = NetworkService.getConnectionInfo();
    assert(connInfo.isOnline === false, 'getConnectionInfo reports offline correctly');
    assert(connInfo.connectionType === 'offline', 'connectionType is offline when disconnected');

    let reconnectedFired = false as boolean;
    const unsubReconnect = NetworkService.onReconnect(() => {
      reconnectedFired = true;
    });

    NetworkService.setOnline(true);
    assert(Boolean(reconnectedFired), 'onReconnect callback triggered when connection restored');
    unsub();
    unsubReconnect();

    // -------------------------------------------------------------
    // Test 2: Local Attendance Creation While Completely Offline
    // -------------------------------------------------------------
    console.log('\n[2] Testing Local Attendance Creation while Offline...');
    // Switch to offline mode
    NetworkService.setOnline(false);

    const TEST_TEACHER = {
      ...SEED_TEACHER,
      id: 'tch-offline-unit-test-1',
      employeeCode: 'TCH-8888',
      fullName: 'Prof. Ada Lovelace',
    };
    await TeacherRepository.save(TEST_TEACHER);

    const mockLocation: LocationVerificationResult = {
      isInside: true,
      distanceMeters: 25,
      coordinates: {
        latitude: 23.217778,
        longitude: 77.408611,
        accuracy: 12,
      },
      isMockedLocation: false,
      accuracyAcceptable: true,
      nearestGeofence: {
        id: 'main-campus',
        name: 'Main Campus',
        latitude: 23.217778,
        longitude: 77.408611,
        radiusMeters: 150,
      },
    };

    const mockVerification: VerificationResult = {
      id: 'ver_offline_test_01',
      passed: true,
      livenessPassed: true,
      livenessScore: 0.95,
      faceMatchPassed: true,
      faceMatchScore: 0.94,
      geofencePassed: true,
      deviceIntegrityPassed: true,
      timestamp: new Date().toISOString(),
    };

    const punchResult = await AttendanceService.markAttendance({
      teacher: TEST_TEACHER,
      punchType: 'CHECK_IN',
      locationResult: mockLocation,
      verificationResult: mockVerification,
    });

    assert(punchResult.success === true, 'Attendance created successfully while offline');
    assert(punchResult.record !== undefined, 'Returned record is populated');
    assert(punchResult.record?.syncStatus === 'PENDING', 'Offline attendance record syncStatus is PENDING');

    // Verify record was stored locally in SQLite
    const storedRecord = await AttendanceRepository.getById(punchResult.record!.id);
    assert(storedRecord !== null, 'Record exists in local SQLite attendance_logs');
    assert(storedRecord?.syncStatus === 'PENDING', 'SQLite attendance_logs confirms PENDING sync_status');

    // Verify record was enqueued in SQLite sync_queue table
    const pendingSyncItems = await SyncQueue.getPending();
    const enqueuedAttendance = pendingSyncItems.find((i) => i.entityId === punchResult.record!.id);
    assert(enqueuedAttendance !== undefined, 'Attendance record was added to SQLite sync_queue table');
    assert(enqueuedAttendance?.status === 'QUEUED', 'sync_queue item status is QUEUED');

    // -------------------------------------------------------------
    // Test 3: Local Verification State & Store Machine
    // -------------------------------------------------------------
    console.log('\n[3] Testing Local Verification State & Store...');
    const verStore = useVerificationStore.getState();
    verStore.reset();
    assert(useVerificationStore.getState().step === 'IDLE', 'Verification store initialized in IDLE');

    verStore.startVerification();
    assert(useVerificationStore.getState().step === 'GEOFENCE_CHECK', 'Advanced to GEOFENCE_CHECK step');
    assert(useVerificationStore.getState().challenges.length === 2, 'Generated 2 liveness challenges');

    verStore.recordChallengeScore(0.96);
    assert(useVerificationStore.getState().step === 'LIVENESS_CHALLENGE', 'Advanced to second challenge');

    verStore.recordChallengeScore(0.92);
    assert(useVerificationStore.getState().step === 'FACE_RECOGNITION', 'Completed challenges, advanced to FACE_RECOGNITION');

    // Complete verification locally
    const execVerResult = await verStore.completeVerification({
      teacher: TEST_TEACHER,
      geofencePassed: true,
      attendanceId: punchResult.record!.id,
    });

    assert(execVerResult.passed === true, 'Verification executed and passed locally');
    assert(useVerificationStore.getState().step === 'SUCCESS', 'Verification store step is SUCCESS');

    // Check verification was saved to SQLite verification_records
    const storedVer = await VerificationRepository.getById(execVerResult.id);
    assert(storedVer !== null, 'Verification result saved to SQLite verification_records table');

    // Check verification was queued for sync
    const allPending = await SyncQueue.getPending();
    const verSyncItem = allPending.find((i) => i.entityId === execVerResult.id);
    assert(verSyncItem !== undefined, 'Verification record was pushed to SQLite sync_queue table');

    // -------------------------------------------------------------
    // Test 4: Offline Engine Safety & Auto-Sync on Network Restoration
    // -------------------------------------------------------------
    console.log('\n[4] Testing Sync Engine Offline Behavior & Cloud Reconciliation...');
    // While offline, engine should not attempt to dispatch and should exit cleanly
    const offlineSyncResult = await syncEngine.processQueue();
    assert(offlineSyncResult.processed === 0, 'SyncEngine gracefully ignores queue when offline');

    // Now restore network connection
    NetworkService.setOnline(true);
    assert(NetworkService.isOnline() === true, 'Network is now online');

    // Trigger sync process
    const onlineSyncResult = await syncEngine.processQueue();
    assert(onlineSyncResult.processed >= 1, `SyncEngine processed ${onlineSyncResult.processed} records upon reconnection`);
    assert(onlineSyncResult.succeeded >= 1, `SyncEngine successfully synced ${onlineSyncResult.succeeded} records`);

    // Verify local SQLite attendance_logs record was updated to SYNCED
    const updatedRecord = await AttendanceRepository.getById(punchResult.record!.id);
    assert(updatedRecord?.syncStatus === 'SYNCED', 'SQLite attendance record sync_status updated to SYNCED');
    assert(updatedRecord?.syncedAt !== undefined, 'SQLite attendance record has syncedAt timestamp');

    // Verify sync_queue status updated to SYNCED
    const allQueueItems = await SyncQueue.getAll();
    const syncedQueueItem = allQueueItems.find((i) => i.entityId === punchResult.record!.id);
    assert(syncedQueueItem?.status === 'SYNCED', 'sync_queue table item marked as SYNCED');

    // -------------------------------------------------------------
    // Test 5: Consecutive Offline Check-Out Punch
    // -------------------------------------------------------------
    console.log('\n[5] Testing Consecutive Offline Check-Out Flow...');
    NetworkService.setOnline(false); // Back to offline

    const checkOutResult = await AttendanceService.markAttendance({
      teacher: TEST_TEACHER,
      punchType: 'CHECK_OUT',
      locationResult: mockLocation,
      verificationResult: mockVerification,
    });

    assert(checkOutResult.success === true, 'Offline Evening Check-Out marked successfully');
    assert(checkOutResult.record?.punchType === 'CHECK_OUT', 'Record punchType is CHECK_OUT');
    assert(checkOutResult.record?.syncStatus === 'PENDING', 'Check-out record queued as PENDING');

    // Check both check-in and check-out exist locally
    const todaySummary = await AttendanceRepository.getTodayRecord(TEST_TEACHER.id);
    assert(todaySummary.checkIn !== undefined, 'Today Check-In exists in local SQLite');
    assert(todaySummary.checkOut !== undefined, 'Today Check-Out exists in local SQLite');

    // Ensure duplicate punch is prevented by domain logic
    const duplicatePunch = await AttendanceService.markAttendance({
      teacher: TEST_TEACHER,
      punchType: 'CHECK_IN',
      locationResult: mockLocation,
      verificationResult: mockVerification,
    });
    assert(duplicatePunch.success === false, 'Duplicate punch correctly blocked by local logic');
    assert(duplicatePunch.rejectionReason === 'PUNCH_NOT_ALLOWED', 'Rejection reason is PUNCH_NOT_ALLOWED');

    // Reconnect and flush remaining items
    NetworkService.setOnline(true);
    await syncManager.triggerSync();
    const finalPendingCount = await SyncQueue.getCount();
    assert(finalPendingCount === 0, `All pending queue records successfully reconciled (pending: ${finalPendingCount})`);

    // Clean up completed items
    await SyncQueue.clearCompleted();
    const clearedItems = await SyncQueue.getAll();
    const syncedRemaining = clearedItems.filter((i) => i.status === 'SYNCED');
    assert(syncedRemaining.length === 0, 'Completed synced records successfully purged from queue');
  } catch (err: any) {
    failed++;
    errors.push(`Unhandled test exception: ${err.message}`);
    console.error('Test threw exception:', err);
  }

  console.log(`\n--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  return { passed, failed, errors };
}

export default runOfflineSyncTests;

// Auto-run when executed directly
runOfflineSyncTests().then((result) => {
  if (result.failed > 0) {
    console.error('\nFailing tests:');
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  process.exit(0);
});
