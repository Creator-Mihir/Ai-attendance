import { DeviceService } from '../../src/services/device.service';
import { CameraService } from '../../src/services/camera.service';
import { BiometricService } from '../../src/services/biometric.service';
import { LocationService } from '../../src/services/location.service';
import { useHardwareStore } from '../../src/store/hardware.store';
import { HARDWARE_CONFIG } from '../../src/constants/hardware';
import { AppConfig } from '../../src/constants/config';

export async function runHardwareTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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

  console.log('\n--- STARTING PHASE 4 HARDWARE LAYER TESTS ---');

  try {
    // -------------------------------------------------------------
    // Test 1: Device Diagnostics, Hardware Info & Anti-Tamper Integrity
    // -------------------------------------------------------------
    console.log('\n[1] Testing Device Diagnostics & Anti-Tamper Service...');
    const deviceInfo = await DeviceService.getDeviceInfo();
    assert(deviceInfo !== null, 'Device info successfully gathered');
    assert(typeof deviceInfo.deviceId === 'string' && deviceInfo.deviceId.length > 0, 'Unique Device ID generated');
    assert(deviceInfo.osName !== '', 'Operating System detected');
    assert(deviceInfo.sensorsAvailable.length >= 3, `Sensors registered (${deviceInfo.sensorsAvailable.join(', ')})`);
    assert(deviceInfo.supportedBiometrics.length > 0, 'Biometric capabilities identified');

    const integrityReport = await DeviceService.getIntegrityReport();
    assert(integrityReport.integrityPassed === true, 'Device passed baseline security integrity checks');
    assert(integrityReport.isRootedOrJailbroken === false, 'No root/jailbreak detected on device');
    assert(integrityReport.isMockLocationActive === false, 'Mock location injection is inactive');

    const integrityVerification = await DeviceService.verifyDeviceIntegrity();
    assert(integrityVerification.passed === true, 'verifyDeviceIntegrity returned passed status');

    const permissions = await DeviceService.checkPermissions();
    assert(typeof permissions.camera === 'boolean', 'Camera permission status evaluated');
    assert(typeof permissions.location === 'boolean', 'Location permission status evaluated');
    assert(typeof permissions.biometric === 'boolean', 'Biometric permission status evaluated');

    const requestedPerms = await DeviceService.requestPermissions();
    assert(requestedPerms.camera === true, 'Camera permission requested and granted');
    assert(requestedPerms.location === true, 'Location permission requested and granted');
    assert(requestedPerms.biometric === true, 'Biometric permission requested and granted');

    // -------------------------------------------------------------
    // Test 2: Camera Subsystem & Capture Pipeline
    // -------------------------------------------------------------
    console.log('\n[2] Testing Camera Subsystem...');
    const cameraInit = await CameraService.initialize({ facing: 'front' });
    assert(cameraInit === true, 'Camera initialized with front-facing lens');
    assert(CameraService.getCurrentFacing() === 'front', 'Current camera lens is front');

    const switchedFacing = CameraService.switchCamera();
    assert(switchedFacing === 'back', 'Toggled camera lens to rear');
    assert(CameraService.getCurrentFacing() === 'back', 'getCurrentFacing confirms rear lens');

    CameraService.switchCamera('front');
    assert(CameraService.getCurrentFacing() === 'front', 'Switched back to front lens for attendance');

    const captureResult = await CameraService.takePhoto({ quality: 0.9 });
    assert(captureResult !== null, 'takePhoto returned capture object');
    assert(captureResult.base64.startsWith('data:image/'), 'Photo contains base64 image data uri');
    assert(captureResult.facing === 'front', 'Captured photo metadata records front facing');
    assert(captureResult.width > 0 && captureResult.height > 0, 'Captured photo has valid image dimensions');
    assert(captureResult.sizeBytes > 0, 'Captured photo file size is calculated');

    const frameBase64 = await CameraService.captureFrame();
    assert(typeof frameBase64 === 'string' && frameBase64.length > 20, 'captureFrame generates frame data for AI scanner');

    // -------------------------------------------------------------
    // Test 3: Biometric Authentication Engine
    // -------------------------------------------------------------
    console.log('\n[3] Testing Biometric Authentication Engine...');
    const isBioSupported = await BiometricService.isSupported();
    assert(isBioSupported === true, 'Biometrics hardware confirmed supported');

    const biometryType = await BiometricService.getBiometryType();
    assert(['FACIAL_RECOGNITION', 'FINGERPRINT', 'IRIS'].includes(biometryType), `Biometry type detected: ${biometryType}`);

    BiometricService.setMockSuccessRate(1.0);
    const authResult = await BiometricService.authenticate('Confirm teacher punch');
    assert(authResult.success === true, 'Biometric identity authentication successful');
    assert(authResult.biometryType === biometryType, 'Biometric result contains valid sensor type');
    assert(authResult.error === undefined, 'No error returned on successful biometric auth');

    // Test rejection scenario
    BiometricService.setMockSuccessRate(0.0);
    const rejectedAuth = await BiometricService.authenticate();
    assert(rejectedAuth.success === false, 'Biometric rejection correctly handled');
    assert(typeof rejectedAuth.error === 'string', 'Rejection error message provided');
    BiometricService.setMockSuccessRate(1.0); // Reset to 100%

    // -------------------------------------------------------------
    // Test 4: High-Accuracy GPS & Campus Geofence Validation
    // -------------------------------------------------------------
    console.log('\n[4] Testing GPS & Campus Geofence Engine...');
    const zeroDist = LocationService.calculateDistanceMeters(23.2177, 77.4086, 23.2177, 77.4086);
    assert(zeroDist === 0, 'Haversine distance is 0 for identical points');

    // ~111km per latitude degree
    const oneDegDist = LocationService.calculateDistanceMeters(0, 0, 1, 0);
    assert(oneDegDist >= 111000 && oneDegDist <= 112000, `Haversine 1 deg latitude is ~111km (computed: ${oneDegDist}m)`);

    const coords = await LocationService.getCurrentPosition();
    assert(typeof coords.latitude === 'number', 'Retrieved valid latitude coordinate');
    assert(typeof coords.longitude === 'number', 'Retrieved valid longitude coordinate');
    assert(coords.accuracy <= 20, `GPS accuracy is within acceptable threshold (${coords.accuracy}m)`);

    // Verify campus geofence inside campus
    const insideCoords = {
      latitude: AppConfig.schoolCampus.latitude + 0.0001,
      longitude: AppConfig.schoolCampus.longitude + 0.0001,
      accuracy: 10,
    };
    const insideResult = await LocationService.getCurrentLocation(insideCoords);
    assert(insideResult.isInside === true, 'Campus coordinates validated inside geofence perimeter');
    assert(insideResult.distanceMeters <= 50, `Distance from campus center is small (${insideResult.distanceMeters}m)`);
    assert(insideResult.accuracyAcceptable === true, 'GPS accuracy acceptable for geofence validation');

    // Verify coordinates outside campus (> 1000m away)
    const outsideCoords = {
      latitude: AppConfig.schoolCampus.latitude + 0.02, // ~2.2 km away
      longitude: AppConfig.schoolCampus.longitude + 0.02,
      accuracy: 10,
    };
    const outsideResult = await LocationService.getCurrentLocation(outsideCoords);
    assert(outsideResult.isInside === false, 'Out-of-boundary coordinates correctly rejected as outside geofence');
    assert(outsideResult.distanceMeters > 1000, `Calculated distance accurately reflects outside location (${outsideResult.distanceMeters}m)`);

    // -------------------------------------------------------------
    // Test 5: Hardware Zustand Store Integration
    // -------------------------------------------------------------
    console.log('\n[5] Testing Hardware Store State Machine...');
    const store = useHardwareStore.getState();
    store.reset();
    assert(useHardwareStore.getState().isInitializing === false, 'Store initialized cleanly in reset state');

    await store.initializeHardware();
    const initializedState = useHardwareStore.getState();
    assert(initializedState.deviceInfo !== null, 'Hardware store populated device information');
    assert(initializedState.permissions.camera === true, 'Hardware store synchronized camera permission');
    assert(initializedState.permissions.location === true, 'Hardware store synchronized location permission');

    // Capture photo through store
    const storePhoto = await store.capturePhoto();
    assert(storePhoto !== null, 'Store captured photo successfully');
    assert(useHardwareStore.getState().capturedPhoto !== null, 'Store state holds capturedPhoto reference');

    // Verify location through store
    const storeLoc = await store.verifyLocation(insideCoords);
    assert(storeLoc.isInside === true, 'Store verified location within campus');
    assert(useHardwareStore.getState().location?.isInside === true, 'Store holds verified location');

    // Biometric authentication through store
    const storeAuth = await store.authenticateBiometric();
    assert(storeAuth.success === true, 'Store authenticated user biometrics');
    assert(useHardwareStore.getState().error === null, 'Store reports zero hardware errors');

    store.clearCapturedPhoto();
    assert(useHardwareStore.getState().capturedPhoto === null, 'clearCapturedPhoto clears active photo');
  } catch (err: any) {
    failed++;
    errors.push(`Unhandled hardware test exception: ${err?.message || String(err)}`);
    console.error('Test threw exception:', err);
  }

  console.log(`\n--- HARDWARE TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  return { passed, failed, errors };
}

export default runHardwareTests;

// Auto-run when executed directly
runHardwareTests().then((result) => {
  if (result.failed > 0) {
    console.error('\nFailing hardware tests:');
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  process.exit(0);
});
