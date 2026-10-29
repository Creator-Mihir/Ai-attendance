export interface DeviceIntegrityReport {
  deviceId: string;
  deviceModel: string;
  osName: string;
  osVersion: string;
  isRootedOrJailbroken: boolean | null;
  isMockLocationActive: boolean | null;
  isEmulator: boolean | null;
  integrityPassed: boolean;
  checkTimestamp: string;
}

export function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'DEV-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  }
  return 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function inspectDeviceIntegrity(): Promise<DeviceIntegrityReport> {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Mobile/TeacherApp';
  let osName = 'Unknown';
  if (/android/i.test(userAgent)) osName = 'Android';
  else if (/mac/i.test(userAgent)) osName = 'macOS';
  else if (/win/i.test(userAgent)) osName = 'Windows';

  // Realistic integrity checks
  const isEmulator = null;
  const isRootedOrJailbroken = null;
  const isMockLocationActive = null;

  return {
    deviceId: generateDeviceId(),
    deviceModel: 'Unknown',
    osName,
    osVersion: 'Unknown',
    isRootedOrJailbroken,
    isMockLocationActive,
    isEmulator,
    // No native attestation provider is integrated; absence of a detected issue
    // is not evidence that the device is trustworthy.
    integrityPassed: false,
    checkTimestamp: new Date().toISOString(),
  };
}
