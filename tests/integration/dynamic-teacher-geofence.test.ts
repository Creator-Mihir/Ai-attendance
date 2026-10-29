import { app } from '../../server/server';
import { backendDb } from '../../server/db';
import { LocationService } from '../../src/services/location.service';
import http from 'node:http';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runLocationTestOnly() {
  console.log('--- STARTING LOCATION COORDINATES DYNAMIC TEST ---\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3096, resolve));
  const BASE_URL = 'http://localhost:3096/api';

  try {
    // 1. Fetch schools from database
    const schools = await backendDb.getSchools();
    const schoolA = schools[0];
    const schoolB = schools[1];

    console.log(`Registered School A: "${schoolA.name}" at (${schoolA.latitude}, ${schoolA.longitude})`);
    console.log(`Registered School B: "${schoolB.name}" at (${schoolB.latitude}, ${schoolB.longitude})\n`);

    // 2. Identify teacher Chitta
    const teachers = await backendDb.getTeachers();
    const chitta = teachers.find((t) => t.full_name?.toLowerCase().includes('chitta')) || teachers[0];
    console.log(`Testing with Faculty: "${chitta.full_name}" (Code: ${chitta.employee_code})`);

    // Assign Chitta to School A first
    await backendDb.updateTeacherSchool(chitta.id, schoolA.id, schoolA.name);

    // 3. Login as Chitta
    console.log('\n[1] Teacher Login: fetching dynamic campus coordinates...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: chitta.employee_code }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Login succeeded');
    const teacherProfile = loginData.data.teacher;

    assert(Boolean(teacherProfile.schoolCampus), 'Login payload delivers dynamic schoolCampus object');
    assert(teacherProfile.schoolCampus.name === schoolA.name, `Campus Name delivered: "${teacherProfile.schoolCampus.name}"`);
    assert(teacherProfile.schoolCampus.latitude === schoolA.latitude, `Dynamic Latitude delivered: ${teacherProfile.schoolCampus.latitude}`);
    assert(teacherProfile.schoolCampus.longitude === schoolA.longitude, `Dynamic Longitude delivered: ${teacherProfile.schoolCampus.longitude}`);
    assert(teacherProfile.schoolCampus.radiusMeters === schoolA.radius_meters, `Dynamic Radius delivered: ${teacherProfile.schoolCampus.radiusMeters}m`);

    // 4. App sets the active campus upon login
    LocationService.setActiveCampus(teacherProfile.schoolCampus);

    // 5. Test Geofence Verification when Chitta is physically at School A
    console.log('\n[2] Verifying Geofence at School A coordinates...');
    const checkAtSchoolA = await LocationService.verifyCampusGeofence({
      latitude: schoolA.latitude,
      longitude: schoolA.longitude,
      accuracy: 5,
    });
    assert(checkAtSchoolA.isInside === true, `Chitta is verified INSIDE "${schoolA.name}"`);
    assert(checkAtSchoolA.nearestGeofence?.name === schoolA.name, 'Verified against School A geofence');

    // 6. State Admin reassigns Chitta to School B
    console.log('\n[3] State Admin changes Chitta\'s School to School B...');
    await backendDb.updateTeacherSchool(chitta.id, schoolB.id, schoolB.name);

    // 7. Chitta logs in again -> dynamic coordinates for School B are delivered
    const loginResB = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: chitta.employee_code }),
    });
    const loginDataB = await loginResB.json();
    const teacherProfileB = loginDataB.data.teacher;

    assert(teacherProfileB.schoolCampus.name === schoolB.name, `New Campus delivered on login: "${teacherProfileB.schoolCampus.name}"`);
    assert(teacherProfileB.schoolCampus.latitude === schoolB.latitude, `New Latitude delivered: ${teacherProfileB.schoolCampus.latitude}`);
    assert(teacherProfileB.schoolCampus.longitude === schoolB.longitude, `New Longitude delivered: ${teacherProfileB.schoolCampus.longitude}`);

    // Update app's active campus with the new login profile
    LocationService.setActiveCampus(teacherProfileB.schoolCampus);

    // 8. Test Geofence Verification when Chitta is physically at School B
    console.log('\n[4] Verifying Geofence at School B coordinates...');
    const checkAtSchoolB = await LocationService.verifyCampusGeofence({
      latitude: schoolB.latitude,
      longitude: schoolB.longitude,
      accuracy: 5,
    });
    assert(checkAtSchoolB.isInside === true, `Chitta is now verified INSIDE "${schoolB.name}"`);
    assert(checkAtSchoolB.nearestGeofence?.name === schoolB.name, 'Verified against School B geofence');

    // And verify that old School A is now outside
    const checkAtOldSchoolA = await LocationService.verifyCampusGeofence({
      latitude: schoolA.latitude,
      longitude: schoolA.longitude,
      accuracy: 5,
    });
    assert(checkAtOldSchoolA.isInside === false, 'Chitta is correctly OUTSIDE when at old School A');

    console.log('\n--- LOCATION TEST ONLY: ALL ASSERTIONS PASSED! ---\n');
  } finally {
    server.close();
  }
}

runLocationTestOnly().catch((err) => {
  console.error('Location Test Failed:', err);
  process.exit(1);
});
