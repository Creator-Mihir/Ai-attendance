import { create } from 'zustand';
import {
  HardwareState,
  HardwarePermissionStatus,
  DeviceInfo,
  CameraCaptureResult,
  CameraOptions,
  BiometricAuthResult,
} from '../types/hardware';
import { LocationVerificationResult, Coordinates } from '../types/location';
import { DeviceService } from '../services/device.service';
import { CameraService } from '../services/camera.service';
import { LocationService } from '../services/location.service';
import { BiometricService } from '../services/biometric.service';

interface HardwareStoreState extends HardwareState {
  initializeHardware: () => Promise<void>;
  checkPermissions: () => Promise<HardwarePermissionStatus>;
  requestPermissions: () => Promise<HardwarePermissionStatus>;
  capturePhoto: (options?: CameraOptions) => Promise<CameraCaptureResult>;
  verifyLocation: (overrideCoords?: Coordinates) => Promise<LocationVerificationResult>;
  authenticateBiometric: (promptMessage?: string) => Promise<BiometricAuthResult>;
  refreshDeviceInfo: () => Promise<DeviceInfo>;
  clearCapturedPhoto: () => void;
  reset: () => void;
}

const initialState: HardwareState = {
  permissions: {
    camera: false,
    location: false,
    biometric: false,
  },
  deviceInfo: null,
  capturedPhoto: null,
  location: null,
  isInitializing: false,
  isCapturing: false,
  isAuthenticating: false,
  isCheckingLocation: false,
  error: null,
};

export const useHardwareStore = create<HardwareStoreState>((set, get) => ({
  ...initialState,

  initializeHardware: async () => {
    set({ isInitializing: true, error: null });
    try {
      const [permissions, deviceInfo] = await Promise.all([
        DeviceService.checkPermissions(),
        DeviceService.getDeviceInfo(),
      ]);

      set({
        permissions,
        deviceInfo,
        isInitializing: false,
      });
    } catch (err: any) {
      set({
        isInitializing: false,
        error: err?.message || 'Failed to initialize hardware layer',
      });
    }
  },

  checkPermissions: async () => {
    const permissions = await DeviceService.checkPermissions();
    set({ permissions });
    return permissions;
  },

  requestPermissions: async () => {
    set({ error: null });
    try {
      const permissions = await DeviceService.requestPermissions();
      set({ permissions });
      return permissions;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to request permissions' });
      return get().permissions;
    }
  },

  capturePhoto: async (options?: CameraOptions) => {
    set({ isCapturing: true, error: null });
    try {
      const photo = await CameraService.takePhoto(options);
      set({ capturedPhoto: photo, isCapturing: false });
      return photo;
    } catch (err: any) {
      set({
        isCapturing: false,
        error: err?.message || 'Failed to capture photo from camera',
      });
      throw err;
    }
  },

  verifyLocation: async (overrideCoords?: Coordinates) => {
    set({ isCheckingLocation: true, error: null });
    try {
      const locResult = await LocationService.getCurrentLocation(overrideCoords);
      set({ location: locResult, isCheckingLocation: false });
      return locResult;
    } catch (err: any) {
      set({
        isCheckingLocation: false,
        error: err?.message || 'Failed to verify GPS location',
      });
      throw err;
    }
  },

  authenticateBiometric: async (promptMessage?: string) => {
    set({ isAuthenticating: true, error: null });
    try {
      const authResult = await BiometricService.authenticate(promptMessage);
      set({
        isAuthenticating: false,
        error: authResult.success ? null : authResult.error || 'Biometric authentication failed',
      });
      return authResult;
    } catch (err: any) {
      set({
        isAuthenticating: false,
        error: err?.message || 'Biometric system error',
      });
      return {
        success: false,
        biometryType: 'NONE',
        error: err?.message,
        timestamp: new Date().toISOString(),
      };
    }
  },

  refreshDeviceInfo: async () => {
    try {
      const deviceInfo = await DeviceService.getDeviceInfo(true);
      set({ deviceInfo });
      return deviceInfo;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to refresh device info' });
      throw err;
    }
  },

  clearCapturedPhoto: () => set({ capturedPhoto: null }),

  reset: () => set({ ...initialState }),
}));

export default useHardwareStore;
