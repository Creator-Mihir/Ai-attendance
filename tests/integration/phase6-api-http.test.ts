import { app } from '../../server/server';
import { backendDb } from '../../server/db';
import http from 'node:http';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runHttpTests() {
  console.log('--- STARTING PHASE 6 HTTP API INTEGRATION TESTS ---\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3099, resolve));

  const BASE_URL = 'http://localhost:3099/api';

  try {
    // 1. Healthcheck
    console.log('[1] Testing Server Healthcheck...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Healthcheck returns HTTP 200');
    assert(healthData.status === 'ok', 'Healthcheck status is ok');

    // 2. Register new teacher
    console.log('\n[2] Testing Faculty Registration API (POST /api/auth/register)...');
    const dynamicCode = 'TCH-' + Math.floor(2000 + Math.random() * 7000);
    const dynamicEmail = `evelyn.${Math.random().toString(36).substring(2, 7)}@academy.edu`;
    const registerPayload = {
      fullName: 'Dr. Evelyn Reed',
      employeeCode: dynamicCode,
      email: dynamicEmail,
      phoneNumber: '+1 (555) 777-1234',
      password: 'facultySecretPassword123',
      department: 'Department of Chemistry',
      designation: 'Associate Professor',
    };

    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerPayload),
    });

    const regData = await regRes.json();
    assert(regRes.status === 201, 'Registration returns HTTP 201 Created');
    assert(regData.success === true, 'Registration reports success');
    assert(regData.data.teacher.employeeCode === dynamicCode, 'Registered teacher has correct employee code');
    assert(Boolean(regData.data.token), 'Registration returns auth token');

    const newTeacherId = regData.data.teacher.id;

    // 3. Duplicate registration rejection
    console.log('\n[3] Testing Duplicate Registration Prevention...');
    const duplicateRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerPayload),
    });
    const dupData = await duplicateRes.json();
    assert(duplicateRes.status === 409, 'Duplicate employee code returns HTTP 409 Conflict');
    assert(dupData.success === false, 'Duplicate registration correctly rejected');

    // 4. Login with registered credentials
    console.log('\n[4] Testing Login with Database Credential Matching (POST /api/auth/login)...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: dynamicCode,
        password: 'facultySecretPassword123',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Login with correct credentials returns HTTP 200');
    assert(loginData.data.teacher.fullName === 'Dr. Evelyn Reed', 'Login returns registered teacher profile');

    // 5. Login with invalid password
    console.log('\n[5] Testing Login Rejection on Bad Password...');
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: dynamicCode,
        password: 'WrongPassword!',
      }),
    });
    const badLoginData = await badLoginRes.json();
    assert(badLoginRes.status === 401, 'Bad password returns HTTP 401 Unauthorized');
    assert(badLoginData.success === false, 'Bad password correctly rejected');

    // 6. Biometric Face Registration
    console.log('\n[6] Testing Face Enrollment API (POST /api/teacher/face/register)...');
    const faceRes = await fetch(`${BASE_URL}/teacher/face/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData.data.token}`,
      },
      body: JSON.stringify({
        teacherId: newTeacherId,
        faceEmbeddingVector: [0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88],
        anglesCaptured: ['FRONT', 'LEFT', 'RIGHT', 'UP'],
        qualityScore: 0.97,
      }),
    });
    const faceData = await faceRes.json();
    assert(faceRes.status === 200, 'Face registration returns HTTP 200');
    assert(faceData.data.faceRegistered === true, 'Teacher profile updated with faceRegistered: true');
    assert(faceData.data.faceEmbedding.vector.length === 8, 'Face embedding vector stored in database');

    // 7. Verify login returns the enrolled face embedding
    console.log('\n[7] Testing Post-Enrollment Login returning Enrolled Face Embedding...');
    const reLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: dynamicCode,
        password: 'facultySecretPassword123',
      }),
    });
    const reLoginData = await reLoginRes.json();
    assert(reLoginData.data.teacher.faceRegistered === true, 'Logged in profile has faceRegistered: true');
    assert(reLoginData.data.teacher.faceEmbedding.vector[0] === 0.11, 'Logged in profile contains registered face vector');

    // 8. Batch Sync API
    console.log('\n[8] Testing Batch Sync API (POST /api/sync/batch)...');
    const testAttId = 'sync-att-' + Math.random().toString(36).substring(2, 8);
    const syncRes = await fetch(`${BASE_URL}/sync/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData.data.token}`,
      },
      body: JSON.stringify({
        records: [
          {
            attendance: {
              id: testAttId,
              teacherId: newTeacherId,
              employeeCode: dynamicCode,
              punchType: 'CHECK_IN',
              timestamp: new Date().toISOString(),
              status: 'PRESENT',
              verificationStatus: 'verified',
              latitude: 23.2135,
              longitude: 77.3885,
              gpsAccuracyMeters: 5,
              distanceFromCampusMeters: 10,
              isInsideGeofence: true,
              verificationId: 'v-001',
              livenessScore: 0.95,
              faceMatchScore: 0.96,
              deviceIntegrityPassed: true,
              createdAt: new Date().toISOString(),
            },
            verification: {
              id: 'v-001',
              passed: true,
              livenessPassed: true,
              faceMatchPassed: true,
              geofencePassed: true,
              deviceIntegrityPassed: true,
              livenessScore: 0.95,
              faceMatchScore: 0.96,
              timestamp: new Date().toISOString(),
              checks: [
                { id: 'face_identity', status: 'PASS' },
                { id: 'face_continuity', status: 'PASS' },
                { id: 'spoken_challenge', status: 'PASS' },
                { id: 'lip_sync', status: 'PASS' },
                { id: 'location', status: 'PASS' },
                { id: 'device_integrity', status: 'PASS' },
              ],
            },
          },
        ],
      }),
    });
    const syncData = await syncRes.json();
    assert(syncRes.status === 200, 'Batch sync returns HTTP 200');
    assert(syncData.data.syncedIds.includes(testAttId), 'Batch sync persisted record to backend database');

    console.log('\n--- PHASE 6 HTTP INTEGRATION TESTS: ALL 14 ASSERTIONS PASSED, 0 FAILED ---\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runHttpTests().catch((err) => {
  console.error('HTTP Test Failure:', err);
  process.exit(1);
});
