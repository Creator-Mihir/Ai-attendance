import { inspectDeviceIntegrity, DeviceIntegrityReport, generateDeviceId } from '../utils/device';
import { checkSystemPermissions, requestCameraPermission, requestLocationPermission } from '../utils/permissions';
import { DeviceInfo, HardwarePermissionStatus } from '../types/hardware';

export class DeviceService {
  private static cachedReport: DeviceIntegrityReport | null = null;
  private static cachedDeviceInfo: DeviceInfo | null = null;

  /**
   * Retrieves comprehensive device information including hardware specs, OS, and security status.
   */
  public static async getDeviceInfo(forceRefresh = false): Promise<DeviceInfo> {
    if (this.cachedDeviceInfo && !forceRefresh) {
      return this.cachedDeviceInfo;
    }

    const integrity = await this.getIntegrityReport(forceRefresh);
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/TestEnvironment';
    
    let manufacturer = 'Unknown';
    if (/pixel/i.test(userAgent)) manufacturer = 'Google';
    else if (/windows/i.test(userAgent)) manufacturer = 'Microsoft';

    this.cachedDeviceInfo = {
      deviceId: integrity.deviceId,
      deviceModel: integrity.deviceModel,
      manufacturer,
      osName: integrity.osName,
      osVersion: integrity.osVersion,
      appVersion: '1.0.0 (Phase 4)',
      isEmulator: integrity.isEmulator,
      isRootedOrJailbroken: integrity.isRootedOrJailbroken,
      isMockLocationActive: integrity.isMockLocationActive,
      screenResolution: {
        width: typeof window !== 'undefined' && window.screen ? window.screen.width : 1170,
        height: typeof window !== 'undefined' && window.screen ? window.screen.height : 2532,
        scale: typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 3,
      },
      supportedBiometrics: [],
      sensorsAvailable: [],
      integrityPassed: integrity.integrityPassed,
      checkedAt: new Date().toISOString(),
    };

    return this.cachedDeviceInfo;
  }

  /**
   * Checks current status of hardware permissions (Camera, Location, Biometrics).
   */
  public static async checkPermissions(): Promise<HardwarePermissionStatus> {
    const sysPerms = await checkSystemPermissions();
    return {
      camera: sysPerms.camera,
      location: sysPerms.location,
      biometric: sysPerms.biometric,
    };
  }

  /**
   * Interactively requests all missing essential hardware permissions.
   */
  public static async requestPermissions(): Promise<HardwarePermissionStatus> {
    const cameraGranted = await requestCameraPermission();
    const locationGranted = await requestLocationPermission();
    const biometricGranted = false; // No OS biometric module is configured in this build.

    return {
      camera: cameraGranted,
      location: locationGranted,
      biometric: biometricGranted,
    };
  }

  public static async getIntegrityReport(forceRefresh = false): Promise<DeviceIntegrityReport> {
    if (!this.cachedReport || forceRefresh) {
      this.cachedReport = await inspectDeviceIntegrity();
    }
    return this.cachedReport;
  }

  public static async refreshIntegrityReport(): Promise<DeviceIntegrityReport> {
    this.cachedReport = await inspectDeviceIntegrity();
    return this.cachedReport;
  }

  public static async verifyDeviceIntegrity(): Promise<{
    allowedToProceed: boolean;
    verified: boolean;
    message: string;
  }> {
    await this.getIntegrityReport();
    const message = 'Device integrity cannot be verified: no native attestation provider is configured.';

    // Development builds may exercise the remaining real checks without
    // claiming that the device passed an attestation check. Production stays
    // fail-closed until a real provider is integrated and verified.
    if (__DEV__) {
      return {
        allowedToProceed: true,
        verified: false,
        message: `${message} Development-only bypass: continuing as unverified.`,
      };
    }

    return { allowedToProceed: false, verified: false, message };
  }
}

export default DeviceService;
