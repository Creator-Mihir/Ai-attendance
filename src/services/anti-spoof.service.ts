import type { DepthLivenessEvidence } from '../types/verification';
import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

interface NativeDepthResult {
  capability: 'SUPPORTED' | 'UNSUPPORTED' | 'UNAVAILABLE';
  status: 'UNSUPPORTED' | 'UNAVAILABLE' | 'ERROR';
  cameraFacing: 'front';
  provider: 'ARCORE_DEPTH_API';
  reason: string;
  checkedAt: number;
}

interface NativeDepthModule {
  checkFrontCameraDepthSupport(): Promise<NativeDepthResult>;
}

export class AntiSpoofService {
  /** Checks actual ARCore and front-camera configuration; this does not prove liveness. */
  public static async checkDepthAvailability(): Promise<DepthLivenessEvidence> {
    if (Platform.OS !== 'android') {
      return {
        capability: 'UNSUPPORTED', status: 'UNSUPPORTED', cameraFacing: 'front',
        provider: 'NONE', reason: 'DEPTH_PROVIDER_ANDROID_ONLY', checkedAt: new Date().toISOString(),
      };
    }

    try {
      const nativeDepth = requireNativeModule<NativeDepthModule>('AttendanceDepth');
      const result = await nativeDepth.checkFrontCameraDepthSupport();
      return {
        capability: result.capability,
        status: result.status,
        cameraFacing: 'front',
        provider: 'ARCORE_DEPTH_API',
        reason: result.reason,
        checkedAt: new Date(result.checkedAt).toISOString(),
      };
    } catch (error) {
      return {
        capability: 'UNAVAILABLE', status: 'ERROR', cameraFacing: 'front',
        provider: 'ARCORE_DEPTH_API',
        reason: `DEPTH_NATIVE_MODULE_UNAVAILABLE: ${error instanceof Error ? error.message : 'unknown native error'}`,
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

export default AntiSpoofService;
