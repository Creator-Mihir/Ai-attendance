import { AttendanceEntity } from '../../src/domain/attendance';

export async function runAttendanceTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      failed++;
      console.error(`  ✗ ${testName}`);
    }
  }

  console.log('\n--- STARTING ATTENDANCE DOMAIN TESTS ---');

  const onTimeIso = '2026-10-02T08:00:00.000Z';
  const status = AttendanceEntity.determineStatus('CHECK_IN', onTimeIso);
  assert(['PRESENT', 'LATE'].includes(status), 'determines on-time vs late status accurately based on cutoff time');

  const existingPunches = {
    checkIn: {
      id: 'att-1',
      teacherId: 'tch-1',
      employeeCode: 'TCH-1042',
      punchType: 'CHECK_IN' as const,
      timestamp: new Date().toISOString(),
      status: 'PRESENT' as const,
      latitude: 28.6139,
      longitude: 77.2090,
      gpsAccuracyMeters: 10,
      distanceFromCampusMeters: 15,
      isInsideGeofence: true,
      verificationId: 'v-1',
      livenessScore: 0.95,
      faceMatchScore: 0.94,
      deviceIntegrityPassed: true,
      syncStatus: 'SYNCED' as const,
      syncAttempts: 1,
      createdAt: new Date().toISOString(),
    },
  };

  const dupResult = AttendanceEntity.canPunch('CHECK_IN', existingPunches);
  assert(dupResult.allowed === false, 'prevents duplicate check-in punches on the same day');
  assert(typeof dupResult.reason === 'string', 'provides reason for disallowed check-in');

  const checkOutResult = AttendanceEntity.canPunch('CHECK_OUT', existingPunches);
  assert(checkOutResult.allowed === true, 'allows check-out when check-in exists and check-out is missing');

  console.log(`\n--- ATTENDANCE TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  return { passed, failed };
}

export default runAttendanceTests;

runAttendanceTests().then((res) => {
  if (res.failed > 0) process.exit(1);
  process.exit(0);
});
