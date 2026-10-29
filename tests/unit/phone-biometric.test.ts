import db from '../../src/database/database';
import { resetDatabase, SEED_TEACHER } from '../../src/database/migrations';
import { TeacherRepository } from '../../src/database/repositories/teacher.repository';
import { AttendanceRepository } from '../../src/database/repositories/attendance.repository';
import { SyncRepository } from '../../src/database/repositories/sync.repository';
import { BiometricService } from '../../src/services/biometric.service';
import { AttendanceService } from '../../src/services/attendance.service';
import { VerificationService } from '../../src/services/verification.service';
import { FaceLockService } from '../../src/services/face-lock.service';
import { LocationVerificationResult } from '../../src/types/location';
import { VerificationResult } from '../../src/types/verification';
import { TeacherProfile } from '../../src/types/teacher';

export async function runPhoneBiometricTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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

  console.log('\n--- STARTING PHONE BIOMETRIC AUTHENTICATION TESTS ---');

  try {
    // 0. Reset Database & ensure clean test state
    await resetDatabase();

    const testTeacher: TeacherProfile = {
      ...SEED_TEACHER,
      id: 'tch-bio-test-01',
      employeeCode: 'TCH-BIO-1',
      fullName: 'Prof. Ada Lovelace',
      faceRegistered: true,
      faceEmbedding: {
        version: 'MobileFaceNet-Offline-v2.1',
        vector: [0.35, -0.12, 0.78, 0.44, -0.25, 0.61, 0.18, -0.52],
        anglesCaptured: ['FRONT', 'LEFT', 'RIGHT', 'UP'],
        enrolledAt: '2026-02-01T10:00:00.000Z',
        qualityScore: 0.99,
      },
    };
    await TeacherRepository.save(testTeacher);

    const mockLocation: LocationVerificationResult = {
      isInside: true,
      accuracyAcceptable: true,
      isMockedLocation: false,
      distanceMeters: 12,
      coordinates: {
        latitude: 23.217778,
        longitude: 77.408611,
        accuracy: 8,
      },
      verifiedAt: new Date().toISOString(),
    };

    // Helper to orchestrate multi-factor verification with phone biometric check
    async function createPipelineVerification(biometricResult: any): Promise<VerificationResult> {
      const challenge = VerificationService.createSpokenChallenge(testTeacher.id);
      FaceLockService.lockSession({
        teacherId: testTeacher.id,
        baselineEmbedding: testTeacher.faceEmbedding!.vector,
      });

      const audioSamples = [
        { timestampMs: 100, level: 0.1 }, { timestampMs: 200, level: 0.5 },
        { timestampMs: 300, level: 0.7 }, { timestampMs: 400, level: 0.8 },
        { timestampMs: 500, level: 0.7 }, { timestampMs: 600, level: 0.5 },
        { timestampMs: 700, level: 0.2 },
      ];
      const mouthSamples = [
        { timestampMs: 100, aperture: 0.1 }, { timestampMs: 200, aperture: 0.4 },
        { timestampMs: 300, aperture: 0.7 }, { timestampMs: 400, aperture: 0.8 },
        { timestampMs: 500, aperture: 0.7 }, { timestampMs: 600, aperture: 0.5 },
        { timestampMs: 700, aperture: 0.1 },
      ];

      return await VerificationService.orchestrateMultiFactorVerification({
        teacher: testTeacher,
        capturedFrame: 'real_camera_mock_frame_for_biometric_test_with_sufficient_length_data',
        challengeId: challenge.id,
        spokenAudioText: challenge.phrase,
        geofencePassed: true,
        deviceIntegrityPassed: true,
        deviceIntegrityAllowedToProceed: true,
        locationResult: mockLocation,
        biometricAuthResult: biometricResult,
        liveVector: testTeacher.faceEmbedding!.vector,
        spokenLivenessEvidence: {
          challengeId: challenge.id,
          recognizedTranscript: challenge.phrase,
          faceContinuityPassed: true,
          audioSamples,
          mouthSamples,
          capturedAt: new Date().toISOString(),
        },
      });
    }

    // -------------------------------------------------------------
    // Test 1: Biometric authentication succeeds → attendance marked
    // -------------------------------------------------------------
    console.log('\n[1] Testing Biometric authentication succeeds → attendance marked...');
    BiometricService.setMockResult({
      success: true,
      biometryType: 'FINGERPRINT',
      timestamp: new Date().toISOString(),
    });

    const successAuth = await BiometricService.authenticate('Scan fingerprint to verify attendance');
    assert(successAuth.success === true, 'Biometric authentication API returned success === true');
    assert(successAuth.biometryType === 'FINGERPRINT', 'Biometry type identified as FINGERPRINT');

    // Orchestrate with successful biometric result
    const successVerification = await createPipelineVerification(successAuth);
    console.log('DEBUG CHECKS:', JSON.stringify(successVerification.checks, null, 2));
    console.log('DEBUG REJECTION:', successVerification.rejectionReason, successVerification.rejectionMessage);
    assert(successVerification.passed === true, 'Multi-factor verification approved with successful biometric check');

    const bioPassCheck = successVerification.checks?.find((c) => c.id === 'phone_biometric');
    assert(bioPassCheck !== undefined && bioPassCheck.status === 'PASS', 'Phone biometric verification check marked as PASS');

    const markResult = await AttendanceService.markAttendance({
      teacher: testTeacher,
      punchType: 'CHECK_IN',
      locationResult: mockLocation,
      verificationResult: successVerification,
    });

    assert(markResult.success === true, 'Attendance successfully marked after biometric success');
    assert(markResult.record !== undefined, 'Attendance record generated with valid ID');
    assert(markResult.record?.verificationStatus === 'verified', 'Record verificationStatus marked as verified');

    // Verify persisted in SQLite
    const savedRecord = await AttendanceRepository.getById(markResult.record!.id);
    assert(savedRecord !== null, 'Attendance record saved in local SQLite database');
    assert(savedRecord?.teacherId === testTeacher.id, 'Persisted record matches teacher ID');

    // -------------------------------------------------------------
    // Test 2: Biometric authentication fails → attendance rejected
    // -------------------------------------------------------------
    console.log('\n[2] Testing Biometric authentication fails → attendance rejected...');
    BiometricService.setMockResult({
      success: false,
      biometryType: 'FINGERPRINT',
      errorCode: 'AUTHENTICATION_FAILED',
      error: 'Biometric verification failed. Fingerprint was not recognized.',
      timestamp: new Date().toISOString(),
    });

    const failedAuth = await BiometricService.authenticate('Scan fingerprint to verify attendance');
    assert(failedAuth.success === false, 'Biometric authentication API returned success === false');
    assert(failedAuth.errorCode === 'AUTHENTICATION_FAILED', 'Failure error code is AUTHENTICATION_FAILED');

    const failedVerification = await createPipelineVerification(failedAuth);
    assert(failedVerification.passed === false, 'Verification rejected when biometric auth fails');
    assert(failedVerification.rejectionReason === 'BIOMETRIC_FAILED', 'Rejection reason is BIOMETRIC_FAILED');

    const bioFailCheck = failedVerification.checks?.find((c) => c.id === 'phone_biometric');
    assert(bioFailCheck !== undefined && bioFailCheck.status === 'FAIL', 'Phone biometric check marked as FAIL in checks list');

    // Attempting to mark attendance must fail
    const blockedAttendance = await AttendanceService.markAttendance({
      teacher: testTeacher,
      punchType: 'CHECK_OUT',
      locationResult: mockLocation,
      verificationResult: failedVerification,
    });

    assert(blockedAttendance.success === false, 'AttendanceService rejects punch on biometric failure');
    assert(blockedAttendance.rejectionReason === 'BIOMETRIC_FAILED', 'AttendanceService returns BIOMETRIC_FAILED rejection reason');

    // -------------------------------------------------------------
    // Test 3: User cancels authentication → attendance not marked
    // -------------------------------------------------------------
    console.log('\n[3] Testing User cancels authentication → attendance not marked...');
    BiometricService.setMockResult({
      success: false,
      biometryType: 'FINGERPRINT',
      errorCode: 'USER_CANCEL',
      error: 'Biometric authentication was cancelled by user.',
      timestamp: new Date().toISOString(),
    });

    const cancelAuth = await BiometricService.authenticate();
    assert(cancelAuth.success === false, 'Cancelled authentication returns success === false');
    assert(cancelAuth.errorCode === 'USER_CANCEL', 'Error code identified as USER_CANCEL');

    const cancelVerification = await createPipelineVerification(cancelAuth);
    assert(cancelVerification.passed === false, 'Verification rejected on user cancellation');
    assert(cancelVerification.rejectionReason === 'BIOMETRIC_CANCELLED', 'Rejection reason is BIOMETRIC_CANCELLED');

    const bioCancelCheck = cancelVerification.checks?.find((c) => c.id === 'phone_biometric');
    assert(bioCancelCheck !== undefined && bioCancelCheck.status === 'FAIL', 'Phone biometric check marked as FAIL on cancel');

    const cancelledPunch = await AttendanceService.markAttendance({
      teacher: testTeacher,
      punchType: 'CHECK_OUT',
      locationResult: mockLocation,
      verificationResult: cancelVerification,
    });

    assert(cancelledPunch.success === false, 'Attendance not marked when user cancels biometric prompt');
    assert(cancelledPunch.record === undefined, 'No attendance record created on user cancellation');

    // -------------------------------------------------------------
    // Test 4: Device has no enrolled biometric → show appropriate message
    // -------------------------------------------------------------
    console.log('\n[4] Testing Device has no enrolled biometric → appropriate message...');
    BiometricService.setMockResult(null); // Clear mock override
    BiometricService.setMockHardwareAvailable(true);
    BiometricService.setMockEnrolled(false); // No biometrics enrolled

    const notEnrolledAuth = await BiometricService.authenticate();
    assert(notEnrolledAuth.success === false, 'Authentication returns false when no biometrics are enrolled');
    assert(notEnrolledAuth.errorCode === 'NOT_ENROLLED', 'Error code is NOT_ENROLLED');
    assert(
      notEnrolledAuth.error?.includes('No biometric credentials enrolled') === true,
      'Provides user-friendly message advising enrollment in phone settings'
    );

    const notEnrolledVerification = await createPipelineVerification(notEnrolledAuth);
    assert(notEnrolledVerification.passed === false, 'Verification fails when no biometrics enrolled');
    assert(notEnrolledVerification.rejectionReason === 'BIOMETRIC_NOT_ENROLLED', 'Rejection reason is BIOMETRIC_NOT_ENROLLED');

    // Test hardware unavailable scenario as well
    BiometricService.setMockHardwareAvailable(false);
    BiometricService.setMockEnrolled(null);
    const noHardwareAuth = await BiometricService.authenticate();
    assert(noHardwareAuth.success === false, 'Authentication returns false when hardware unavailable');
    assert(noHardwareAuth.errorCode === 'NO_HARDWARE', 'Error code is NO_HARDWARE');

    // Reset mocks
    BiometricService.setMockHardwareAvailable(null);
    BiometricService.setMockEnrolled(null);
    BiometricService.setMockResult(null);

    // -------------------------------------------------------------
    // Test 5: Attendance is saved locally and synced using existing sync mechanism
    // -------------------------------------------------------------
    console.log('\n[5] Testing Attendance is saved locally and synced using existing sync mechanism...');
    BiometricService.setMockResult({
      success: true,
      biometryType: 'FINGERPRINT',
      timestamp: new Date().toISOString(),
    });

    const eveningAuth = await BiometricService.authenticate();
    const eveningVerification = await createPipelineVerification(eveningAuth);

    const eveningPunch = await AttendanceService.markAttendance({
      teacher: testTeacher,
      punchType: 'CHECK_OUT',
      locationResult: mockLocation,
      verificationResult: eveningVerification,
    });

    assert(eveningPunch.success === true, 'Evening check-out marked successfully with biometric verification');
    assert(eveningPunch.record?.punchType === 'CHECK_OUT', 'Record punchType is CHECK_OUT');
    assert(eveningPunch.record?.syncStatus === 'PENDING', 'Initial sync status is PENDING (ready for sync)');

    // Verify in SQLite AttendanceRepository
    const localEvening = await AttendanceRepository.getById(eveningPunch.record!.id);
    assert(localEvening !== null, 'Evening record persisted in SQLite attendance_logs table');

    // Verify in SyncRepository queue
    const pendingSyncItems = await SyncRepository.getPendingItems();
    const queuedAttendance = pendingSyncItems.find((item) => item.entityId === eveningPunch.record!.id);
    assert(queuedAttendance !== undefined, 'Record automatically enqueued into SyncQueue for offline-first replication');
    assert(queuedAttendance?.entityType === 'ATTENDANCE', 'Sync queue item has entityType ATTENDANCE');
    assert(queuedAttendance?.status === 'PENDING', 'Sync queue item status is PENDING');

    // Simulate sync completion
    if (queuedAttendance) {
      await SyncRepository.updateStatus(queuedAttendance.id, 'SYNCED');
      await AttendanceRepository.updateSyncStatus(eveningPunch.record!.id, 'SYNCED');
      const syncedRecord = await AttendanceRepository.getById(eveningPunch.record!.id);
      assert(syncedRecord?.syncStatus === 'SYNCED', 'Attendance record syncStatus successfully updated to SYNCED');
    }

    // Clean up mock override
    BiometricService.setMockResult(null);

  } catch (err: any) {
    failed++;
    errors.push(`Unhandled exception in biometric tests: ${err?.message || String(err)}`);
    console.error('Test threw exception:', err);
  }

  console.log(`\n--- PHONE BIOMETRIC TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  return { passed, failed, errors };
}

export default runPhoneBiometricTests;

runPhoneBiometricTests().then((res) => {
  if (res.failed > 0) {
    console.error('\nFailing tests:');
    res.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  process.exit(0);
});
