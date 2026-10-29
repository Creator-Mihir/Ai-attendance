import { app } from '../../server/server';
import { backendDb } from '../../server/db';
import http from 'node:http';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runAdminTierTests() {
  console.log('--- STARTING MULTI-TIER ADMIN INTEGRATION TESTS ---\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3098, resolve));
  const BASE_URL = 'http://localhost:3098/api';

  try {
    // 1. Authenticate as State Admin
    console.log('[1] Testing State Admin Authentication...');
    const stateLoginRes = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'stateadmin@attendance.gov', password: 'admin123456' }),
    });
    const stateLoginData = await stateLoginRes.json();
    assert(stateLoginRes.status === 200, 'State admin login returns HTTP 200');
    assert(stateLoginData.success === true, 'State admin login succeeds');
    assert(stateLoginData.data.admin.role === 'state_admin', 'Role is state_admin');
    const stateToken = stateLoginData.data.token;

    // 2. Authenticate as District Admin
    console.log('\n[2] Testing District Admin Authentication...');
    const distLoginRes = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'districtadmin@attendance.gov', password: 'admin123456' }),
    });
    const distLoginData = await distLoginRes.json();
    assert(distLoginRes.status === 200, 'District admin login returns HTTP 200');
    assert(distLoginData.data.admin.role === 'district_admin', 'Role is district_admin');
    assert(distLoginData.data.admin.jurisdictionDistrictId === 'DIST-BPL-01', 'District admin is scoped to DIST-BPL-01');
    const distToken = distLoginData.data.token;

    // 3. Authenticate as School Admin
    console.log('\n[3] Testing School Admin Authentication...');
    const schLoginRes = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'schooladmin@attendance.gov', password: 'admin123456' }),
    });
    const schLoginData = await schLoginRes.json();
    assert(schLoginRes.status === 200, 'School admin login returns HTTP 200');
    assert(schLoginData.data.admin.role === 'school_admin', 'Role is school_admin');
    assert(schLoginData.data.admin.jurisdictionSchoolId === 'branch-main-01', 'School admin is scoped to branch-main-01');
    const schToken = schLoginData.data.token;

    // 4. Fetch Schools
    console.log('\n[4] Testing Schools Retrieval API...');
    const schoolsRes = await fetch(`${BASE_URL}/schools`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    const schoolsData = await schoolsRes.json();
    assert(schoolsRes.status === 200, 'Schools list returns HTTP 200');
    assert(Array.isArray(schoolsData.data), 'Schools data is an array');
    assert(schoolsData.data.length >= 3, 'At least 3 schools seeded');

    const firstSchool = schoolsData.data[0];
    assert(typeof firstSchool.latitude === 'number', 'School has numeric latitude');
    assert(typeof firstSchool.longitude === 'number', 'School has numeric longitude');
    assert(typeof firstSchool.radius_meters === 'number', 'School has geofence radius');

    // 5. State Admin saves updated coordinates for a school
    console.log('\n[5] Testing State Admin Updating School Location Coordinates...');
    const newLat = 23.2185;
    const newLng = 77.3892;
    const newRad = 185;
    const coordUpdateRes = await fetch(`${BASE_URL}/schools/${firstSchool.id}/coordinates`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stateToken}`,
      },
      body: JSON.stringify({ latitude: newLat, longitude: newLng, radiusMeters: newRad }),
    });
    const coordUpdateData = await coordUpdateRes.json();
    assert(coordUpdateRes.status === 200, 'Coordinates update returns HTTP 200');
    assert(coordUpdateData.success === true, 'Coordinates update reports success');
    assert(Math.abs(coordUpdateData.data.latitude - newLat) < 0.0001, 'Updated latitude matches');
    assert(Math.abs(coordUpdateData.data.longitude - newLng) < 0.0001, 'Updated longitude matches');
    assert(coordUpdateData.data.radius_meters === newRad, 'Updated radius matches');

    // 6. District Admin cannot update school coordinates (Forbidden)
    console.log('\n[6] Testing RBAC: District Admin forbidden from modifying coordinates...');
    const forbidRes = await fetch(`${BASE_URL}/schools/${firstSchool.id}/coordinates`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${distToken}`,
      },
      body: JSON.stringify({ latitude: 20, longitude: 70, radiusMeters: 100 }),
    });
    assert(forbidRes.status === 403, 'District admin gets HTTP 403 Forbidden on coordinates update');

    // 7. Faculty retrieval and teacher school check
    console.log('\n[7] Testing Teachers Retrieval and School ID check...');
    const teachersRes = await fetch(`${BASE_URL}/admin/teachers`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    const teachersData = await teachersRes.json();
    assert(teachersRes.status === 200, 'Teachers list returns HTTP 200');
    assert(teachersData.data.length > 0, 'Teachers exist in database');

    const sampleTeacher = teachersData.data[0];
    assert(Boolean(sampleTeacher.school_id), `Teacher ${sampleTeacher.full_name} has valid school_id (${sampleTeacher.school_id})`);

    // 8. State Admin transfers a teacher to another school
    console.log('\n[8] Testing State Admin Teacher School Transfer Capability...');
    const secondSchool = schoolsData.data[1];
    const transferRes = await fetch(`${BASE_URL}/admin/teachers/${sampleTeacher.id}/school`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stateToken}`,
      },
      body: JSON.stringify({ newSchoolId: secondSchool.id, newSchoolName: secondSchool.name }),
    });
    const transferData = await transferRes.json();
    assert(transferRes.status === 200, 'Teacher transfer returns HTTP 200');
    assert(transferData.success === true, 'Teacher transfer reports success');
    assert(transferData.data.schoolId === secondSchool.id, `Teacher reassigned to school ID: ${secondSchool.id}`);
    assert(transferData.data.schoolBranchName === secondSchool.name, `Teacher reassigned to school name: ${secondSchool.name}`);

    // Verify persistence in DB
    const persistedTeacher = await backendDb.getTeacherById(sampleTeacher.id);
    assert(persistedTeacher.school_id === secondSchool.id, 'Teacher school_id is persisted in database');

    // 9. Dynamic Geofence Zones endpoint serves DB schools
    console.log('\n[9] Testing Dynamic Geofence Zones API...');
    const geofenceRes = await fetch(`${BASE_URL}/attendance/geofence-zones`);
    const geofenceData = await geofenceRes.json();
    assert(geofenceRes.status === 200, 'Geofence zones API returns HTTP 200');
    assert(geofenceData.data.length >= 3, 'Serves all active schools as geofence zones');
    const foundUpdated = geofenceData.data.find((z: any) => z.id === firstSchool.id);
    assert(Boolean(foundUpdated), 'Updated school is in active geofence zones');
    assert(Math.abs(foundUpdated.latitude - newLat) < 0.0001, 'Geofence zone latitude reflects saved coordinates');

    console.log('\n--- ALL MULTI-TIER ADMIN TESTS PASSED SUCCESSFULLY! ---\n');
  } finally {
    server.close();
  }
}

runAdminTierTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
