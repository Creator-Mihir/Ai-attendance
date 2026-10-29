import { SyncQueue } from '../../src/sync/sync-queue';
import { SyncEngine } from '../../src/sync/sync-engine';
import { apiClient } from '../../src/api/client';
import { AttendanceRecord } from '../../src/types/attendance';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export async function runSyncIntegrationTests() {
  console.log('\n--- STARTING SYNC ENGINE INTEGRATION TESTS ---');

  const dummyRecord: AttendanceRecord = {
    id: 'test_rec_01',
    teacherId: 'tch-test',
    employeeCode: 'TCH-TEST',
    punchType: 'CHECK_IN',
    timestamp: new Date().toISOString(),
    status: 'PRESENT',
    latitude: 28.6139,
    longitude: 77.2090,
    gpsAccuracyMeters: 10,
    distanceFromCampusMeters: 12,
    isInsideGeofence: true,
    verificationId: 'v-dummy',
    livenessScore: 0.95,
    faceMatchScore: 0.94,
    deviceIntegrityPassed: true,
    syncStatus: 'PENDING',
    syncAttempts: 0,
    createdAt: new Date().toISOString(),
  };

  // 1. Enqueue record
  const item = await SyncQueue.pushAttendance(dummyRecord);
  assert(item.status === 'QUEUED', 'enqueues record into sync queue');

  // 2. Process when network is online
  apiClient.setNetworkOnline(true);
  const engine = new SyncEngine();
  const result = await engine.processQueue();
  assert(result.processed >= 1, 'reconciles upon online status');

  console.log('--- SYNC ENGINE INTEGRATION TEST PASSED ---\n');
}

runSyncIntegrationTests().catch((err) => {
  console.error('Sync Test Failure:', err);
  process.exit(1);
});

