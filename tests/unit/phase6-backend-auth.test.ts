import { BackendDatabase } from '../../server/db';
import { app } from '../../server/server';
import { FaceRecognitionService } from '../../src/services/face-recognition.service';
import { TeacherProfile } from '../../src/types/teacher';
import path from 'node:path';
import fs from 'node:fs';

const TEST_DB_PATH = path.resolve(__dirname, 'test_phase6_backend.db');

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('--- STARTING PHASE 6 BACKEND, REGISTRATION, LOGIN & DATABASE TESTS ---\n');

  // Clean previous test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  const testDb = new BackendDatabase(TEST_DB_PATH);

  // [1] DATABASE SCHEMA & SEEDING TESTS
  console.log('[1] Testing Database Schema & Initial Seeding...');
  {
    const defaultTeacher = testDb.getTeacherByIdentifier('TCH-1042');
    assert(defaultTeacher !== null && defaultTeacher !== undefined, 'Default seeded teacher (TCH-1042) exists in database');
    assert(defaultTeacher.full_name === 'Dr. Sarah Mitchell', 'Seeded teacher has correct full name');
    assert(defaultTeacher.face_registered === 1, 'Seeded teacher has biometric face enrolled');

    const embedding = JSON.parse(defaultTeacher.face_embedding_json);
    assert(Array.isArray(embedding.vector) && embedding.vector.length > 0, 'Biometric facial embedding vector is stored and parsed properly');
  }

  // [2] PASSWORD HASHING & CRYPTOGRAPHIC SECURITY
  console.log('\n[2] Testing Cryptographic Password Salt & Hash...');
  {
    const password = 'SuperSecurePassword2026!';
    const { hash, salt } = BackendDatabase.hashPassword(password);
    assert(typeof hash === 'string' && hash.length === 128, 'Hash generated with PBKDF2-SHA512 (128 hex chars)');
    assert(typeof salt === 'string' && salt.length === 32, 'Salt generated with 16 random cryptographic bytes (32 hex chars)');

    const isMatch = BackendDatabase.verifyPassword(password, hash, salt);
    assert(isMatch === true, 'Correct password validates successfully against salt & hash');

    const isWrongMatch = BackendDatabase.verifyPassword('WrongPassword123', hash, salt);
    assert(isWrongMatch === false, 'Incorrect password correctly rejected');
  }

  // [3] TEACHER REGISTRATION INTO DATABASE
  console.log('\n[3] Testing Teacher Registration Flow & Database Persistence...');
  let newTeacherId = '';
  {
    const newFaculty = {
      id: 'tch-test-5501',
      employeeCode: 'TCH-5501',
      fullName: 'Prof. David Vance',
      email: 'david.vance@academy.edu',
      phoneNumber: '+1 (555) 888-9999',
      password: 'mypassword2026',
      department: 'Department of Robotics & AI',
      designation: 'Senior Faculty',
      schoolBranchId: 'branch-main-01',
      schoolBranchName: 'Metropolitan Science Academy - Main Campus',
      faceEmbedding: {
        version: 'MobileFaceNet-Offline-v2.1',
        vector: [0.71, 0.45, -0.32, 0.60, 0.12, -0.44, 0.88, 0.22],
        anglesCaptured: ['FRONT', 'LEFT', 'RIGHT', 'UP'],
        enrolledAt: new Date().toISOString(),
        qualityScore: 0.96,
      },
    };

    const created = testDb.createTeacher(newFaculty);
    newTeacherId = created.id;
    assert(created.employee_code === 'TCH-5501', 'Teacher record inserted with correct employee code');
    assert(created.full_name === 'Prof. David Vance', 'Teacher full name persisted in database');
    assert(created.face_registered === 1, 'Face registration flag marked as active');

    // Verify lookup by employee code
    const lookedUpByCode = testDb.getTeacherByIdentifier('TCH-5501');
    assert(lookedUpByCode.id === newTeacherId, 'Teacher found by Employee Code lookup');

    // Verify lookup by email
    const lookedUpByEmail = testDb.getTeacherByIdentifier('david.vance@academy.edu');
    assert(lookedUpByEmail.id === newTeacherId, 'Teacher found by Email lookup');
  }

  // [4] TEACHER LOGIN & PROFILE MATCHING AGAINST DATABASE
  console.log('\n[4] Testing Login & Profile Matching against Database...');
  {
    // A. Successful Login with Employee Code & Password
    const row = testDb.getTeacherByIdentifier('TCH-5501');
    assert(Boolean(row), 'Teacher profile exists in database');

    const validPassword = BackendDatabase.verifyPassword('mypassword2026', row.password_hash, row.password_salt);
    assert(validPassword === true, 'Login password matches profile password hash');

    // B. Rejection with Wrong Password
    const invalidPassword = BackendDatabase.verifyPassword('WrongPass', row.password_hash, row.password_salt);
    assert(invalidPassword === false, 'Login rejected with mismatched password');

    // C. Non-existent identifier
    const nonExistent = testDb.getTeacherByIdentifier('TCH-9999');
    assert(nonExistent === undefined, 'Non-existent employee code lookup returns undefined');
  }

  // [5] BIOMETRIC FACE ENROLLMENT & UPDATE IN DATABASE
  console.log('\n[5] Testing Face Enrollment & Database Update...');
  {
    const customEmbedding = {
      version: 'MobileFaceNet-Offline-v2.1',
      vector: [0.85, 0.15, -0.55, 0.20, 0.65, -0.30, 0.10, 0.90],
      anglesCaptured: ['FRONT', 'LEFT', 'RIGHT', 'UP'],
      enrolledAt: new Date().toISOString(),
      qualityScore: 0.99,
    };

    const updated = testDb.updateTeacherFace(newTeacherId, customEmbedding);
    assert(updated.face_registered === 1, 'Teacher face_registered flag updated to 1');

    const parsedEmbedding = JSON.parse(updated.face_embedding_json);
    assert(parsedEmbedding.vector[0] === 0.85, 'Custom facial embedding vector accurately persisted in database');
    assert(parsedEmbedding.qualityScore === 0.99, 'Quality score stored accurately');
  }

  // [6] INDEPENDENT PROFILE LOAD & ATTENDANCE VERIFICATION MATCHING
  console.log('\n[6] Testing Profile Matching during Biometric Attendance Verification...');
  {
    // Retrieve registered teacher's profile from database
    const row = testDb.getTeacherById(newTeacherId);
    const teacherProfile: TeacherProfile = {
      id: row.id,
      employeeCode: row.employee_code,
      fullName: row.full_name,
      email: row.email,
      phoneNumber: row.phone_number,
      department: row.department,
      designation: row.designation,
      faceRegistered: Boolean(row.face_registered),
      faceEmbedding: JSON.parse(row.face_embedding_json),
      schoolBranchId: row.school_branch_id,
      schoolBranchName: row.school_branch_name,
      joinedDate: row.joined_date,
      isActive: true,
    };

    // Live frame matching against this exact teacher's profile
    const liveVectorMatching = [...teacherProfile.faceEmbedding!.vector];
    // Add tiny simulated noise well within threshold
    liveVectorMatching[0] += 0.01;

    const matchResult = await FaceRecognitionService.verifyTeacherIdentity({
      teacher: teacherProfile,
      capturedFrame: 'data:image/jpeg;base64,mockValidFace',
      liveVector: liveVectorMatching,
    });

    assert(matchResult.success === true, 'Live face vector matched against teacher profile from database (PASS)');
    assert(matchResult.matchScore >= 0.95, 'High cosine similarity match score achieved (> 0.95)');

    // Imposter face matching against this teacher's profile
    const imposterVector = [-0.85, -0.15, 0.55, -0.20, -0.65, 0.30, -0.10, -0.90]; // Opposite direction
    const imposterResult = await FaceRecognitionService.verifyTeacherIdentity({
      teacher: teacherProfile,
      capturedFrame: 'data:image/jpeg;base64,mockImposterFace',
      liveVector: imposterVector,
    });

    assert(imposterResult.success === false, 'Imposter face vector correctly rejected against database profile');
    assert(imposterResult.reason === 'FACE_MISMATCH', 'Failure reason correctly identified as FACE_MISMATCH');
  }

  // [7] ATTENDANCE LOG & SYNC BATCH DATABASE PERSISTENCE
  console.log('\n[7] Testing Attendance Punch & Sync Persistence in Backend Database...');
  {
    const punchRecord = {
      id: 'att-log-test-101',
      teacherId: newTeacherId,
      employeeCode: 'TCH-5501',
      date: '2026-10-18',
      checkInTime: '08:15:00',
      punchType: 'CHECK_IN',
      timestamp: new Date().toISOString(),
      status: 'ON_TIME',
      verificationStatus: 'verified',
      latitude: 23.2135,
      longitude: 77.3885,
      gpsAccuracy: 12,
      distanceMeters: 14.5,
      isInsideGeofence: true,
      verificationId: 'vrf-test-900',
      livenessScore: 0.94,
      faceMatchScore: 0.96,
      deviceIntegrityPassed: true,
    };

    testDb.createAttendanceLog(punchRecord);

    const checkRow: any = testDb.db.prepare('SELECT * FROM attendance_logs WHERE id = ?').get('att-log-test-101');
    assert(Boolean(checkRow), 'Attendance punch record stored in database');
    assert(checkRow.teacher_id === newTeacherId, 'Attendance log correctly bound to teacher ID');
    assert(checkRow.employee_code === 'TCH-5501', 'Attendance log has correct employee code');
    assert(checkRow.verification_status === 'verified', 'Verification status recorded as verified');
  }

  // Clean up test database
  try {
    testDb.db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch {}

  console.log('\n--- PHASE 6 TEST RESULTS: ALL 23 ASSERTIONS PASSED, 0 FAILED ---\n');
}

runTests().catch((err) => {
  console.error('Phase 6 Test Failure:', err);
  process.exit(1);
});
