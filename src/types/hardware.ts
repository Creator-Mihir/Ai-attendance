import { LocationVerificationResult } from './location';

export type PermissionType = 'camera' | 'location' | 'biometric';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface HardwarePermissionStatus {
  camera: boolean;
  location: boolean;
  biometric: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  deviceModel: string;
  manufacturer: string;
  osName: string;
  osVersion: string;
  appVersion: string;
  isEmulator: boolean | null;
  isRootedOrJailbroken: boolean | null;
  isMockLocationActive: boolean | null;
  batteryLevel?: number;
  isCharging?: boolean;
  screenResolution?: {
    width: number;
    height: number;
    scale: number;
  };
  supportedBiometrics: ('FINGERPRINT' | 'FACIAL_RECOGNITION' | 'IRIS')[];
  sensorsAvailable: string[];
  integrityPassed: boolean;
  checkedAt: string;
}

export type CameraFacing = 'front' | 'back';

export interface CameraOptions {
  facing?: CameraFacing;
  quality?: number; // 0.1 to 1.0
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png';
  mirror?: boolean;
}

export interface CameraCaptureResult {
  uri: string;
  base64: string;
  width: number;
  height: number;
  format: 'jpeg' | 'png';
  facing: CameraFacing;
  timestamp: string;
  sizeBytes: number;
  spatialHistogram?: number[];
}

export type BiometricType = 'FINGERPRINT' | 'FACIAL_RECOGNITION' | 'IRIS' | 'NONE';

export interface BiometricAuthResult {
  success: boolean;
  biometryType: BiometricType;
  error?: string;
  errorCode?: string;
  timestamp: string;
}

export interface HardwareState {
  permissions: HardwarePermissionStatus;
  deviceInfo: DeviceInfo | null;
  capturedPhoto: CameraCaptureResult | null;
  location: LocationVerificationResult | null;
  isInitializing: boolean;
  isCapturing: boolean;
  isAuthenticating: boolean;
  isCheckingLocation: boolean;
  error: string | null;
}
