import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

interface NativeDepthModule {
  checkFrontCameraDepthSupport?: () => Promise<any>;
  isDeveloperOptionsEnabled?: () => Promise<boolean>;
  openDeveloperSettings?: () => Promise<boolean>;
}

let nativeModule: NativeDepthModule | null = null;
function getNativeModule(): NativeDepthModule | null {
  if (Platform.OS !== 'android') return null;
  if (!nativeModule) {
    try {
      nativeModule = requireNativeModule<NativeDepthModule>('AttendanceDepth');
    } catch {
      nativeModule = null;
    }
  }
  return nativeModule;
}

export async function checkDeveloperOptionsEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const mod = getNativeModule();
    if (mod && typeof mod.isDeveloperOptionsEnabled === 'function') {
      return await mod.isDeveloperOptionsEnabled();
    }
    return false;
  } catch {
    return false;
  }
}

export async function openDeviceDeveloperSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const mod = getNativeModule();
    if (mod && typeof mod.openDeveloperSettings === 'function') {
      return await mod.openDeveloperSettings();
    }
    return false;
  } catch {
    return false;
  }
}

export default {
  checkDeveloperOptionsEnabled,
  openDeviceDeveloperSettings,
};
