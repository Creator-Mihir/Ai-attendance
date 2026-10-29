import * as LocalAuthentication from 'expo-local-authentication';
import { BiometricAuthResult, BiometricType } from '../types/hardware';

export class BiometricService {
  private static mockOverride: BiometricAuthResult | null = null;
  private static mockSuccessRate: number | null = null;
  private static mockHardwareAvailable: boolean | null = null;
  private static mockEnrolled: boolean | null = null;
  private static detectedBiometryType: BiometricType = 'FINGERPRINT';

  /**
   * For testing: set a deterministic mock result for the authenticate() call.
   * Passing null restores native hardware / API behavior.
   */
  public static setMockResult(result: BiometricAuthResult | null): void {
    this.mockOverride = result;
  }

  /**
   * For testing: simulate hardware availability.
   */
  public static setMockHardwareAvailable(available: boolean | null): void {
    this.mockHardwareAvailable = available;
  }

  /**
   * For testing: simulate whether biometrics are enrolled.
   */
  public static setMockEnrolled(enrolled: boolean | null): void {
    this.mockEnrolled = enrolled;
  }

  public static setMockSuccessRate(rate: number): void {
    this.mockSuccessRate = Math.max(0, Math.min(1, rate));
  }

  public static setBiometryType(type: BiometricType): void {
    this.detectedBiometryType = type;
  }

  /**
   * Checks whether the physical phone has biometric authentication hardware.
   */
  public static async isHardwareAvailable(): Promise<boolean> {
    if (this.mockHardwareAvailable !== null) {
      return this.mockHardwareAvailable;
    }
    if (this.mockOverride !== null) {
      return true;
    }
    try {
      if (typeof LocalAuthentication?.hasHardwareAsync === 'function') {
        return await LocalAuthentication.hasHardwareAsync();
      }
    } catch (e) {
      console.warn('[BiometricService] hasHardwareAsync failed:', e);
    }
    return false;
  }

  /**
   * Checks whether biometrics (fingerprint/face) are enrolled on this phone.
   */
  public static async isEnrolled(): Promise<boolean> {
    if (this.mockEnrolled !== null) {
      return this.mockEnrolled;
    }
    if (this.mockOverride !== null) {
      return true;
    }
    try {
      if (typeof LocalAuthentication?.isEnrolledAsync === 'function') {
        return await LocalAuthentication.isEnrolledAsync();
      }
    } catch (e) {
      console.warn('[BiometricService] isEnrolledAsync failed:', e);
    }
    return false;
  }

  /**
   * Checks whether biometric hardware is present and enrolled on this device.
   */
  public static async isSupported(): Promise<boolean> {
    const hasHardware = await this.isHardwareAvailable();
    if (!hasHardware) return false;
    return await this.isEnrolled();
  }

  public static async isBiometricAvailable(): Promise<boolean> {
    return this.isSupported();
  }

  /**
   * Returns the primary biometric authentication mechanism available on this phone.
   */
  public static async getBiometryType(): Promise<BiometricType> {
    if (this.mockOverride !== null) {
      return this.mockOverride.biometryType;
    }
    try {
      if (typeof LocalAuthentication?.supportedAuthenticationTypesAsync === 'function') {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          return 'FINGERPRINT';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          return 'FACIAL_RECOGNITION';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          return 'IRIS';
        }
      }
    } catch (e) {
      console.warn('[BiometricService] supportedAuthenticationTypesAsync failed:', e);
    }
    return this.detectedBiometryType;
  }

  /**
   * Prompts the teacher for native phone biometric authentication (Fingerprint / Biometric).
   *
   * 1. Checks whether phone has biometric hardware.
   * 2. Checks whether biometric is enrolled.
   * 3. Triggers native Expo LocalAuthentication prompt.
   * 4. Maps result (success, failure, cancellation, or enrollment missing).
   */
  public static async authenticate(
    promptMessage = 'Scan fingerprint to verify attendance'
  ): Promise<BiometricAuthResult> {
    const timestamp = new Date().toISOString();

    // 1. Direct mock override check (useful for unit and offline tests)
    if (this.mockOverride !== null) {
      return {
        ...this.mockOverride,
        timestamp,
      };
    }

    if (this.mockSuccessRate !== null) {
      const isSuccess = Math.random() <= this.mockSuccessRate;
      return {
        success: isSuccess,
        biometryType: this.detectedBiometryType,
        errorCode: isSuccess ? undefined : 'AUTHENTICATION_FAILED',
        error: isSuccess ? undefined : 'Biometric match rejected. Please try again.',
        timestamp,
      };
    }

    // 2. Hardware presence check
    const hasHardware = await this.isHardwareAvailable();
    if (!hasHardware) {
      return {
        success: false,
        biometryType: 'NONE',
        errorCode: 'NO_HARDWARE',
        error: 'Biometric hardware is not available on this device.',
        timestamp,
      };
    }

    // 3. Biometric enrollment check
    const enrolled = await this.isEnrolled();
    if (!enrolled) {
      return {
        success: false,
        biometryType: 'NONE',
        errorCode: 'NOT_ENROLLED',
        error: 'No biometric credentials enrolled on this device. Please set up fingerprint or biometrics in phone settings.',
        timestamp,
      };
    }

    const biometryType = await this.getBiometryType();

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Device Passcode',
      });

      if (result.success === true) {
        return {
          success: true,
          biometryType,
          timestamp,
        };
      }

      // Handle failure / cancellation
      const rawError = (result as { success: false; error: string }).error;
      let errorCode = 'BIOMETRIC_FAILED';
      let errorMessage = 'Biometric authentication failed. Please try again.';

      switch (rawError) {
        case 'user_cancel':
          errorCode = 'USER_CANCEL';
          errorMessage = 'Biometric authentication was cancelled by user.';
          break;
        case 'app_cancel':
        case 'system_cancel':
          errorCode = 'SYSTEM_CANCEL';
          errorMessage = 'Biometric authentication was cancelled by the system.';
          break;
        case 'not_enrolled':
          errorCode = 'NOT_ENROLLED';
          errorMessage = 'No biometric credentials enrolled on this device. Please set up fingerprint in phone settings.';
          break;
        case 'not_available':
          errorCode = 'NOT_AVAILABLE';
          errorMessage = 'Biometric authentication is not available on this device.';
          break;
        case 'lockout':
          errorCode = 'LOCKOUT';
          errorMessage = 'Biometric sensor is temporarily locked due to too many failed attempts. Try again later.';
          break;
        case 'authentication_failed':
          errorCode = 'AUTHENTICATION_FAILED';
          errorMessage = 'Biometric verification failed. Fingerprint was not recognized.';
          break;
        default:
          errorCode = rawError || 'BIOMETRIC_FAILED';
          errorMessage = `Biometric authentication failed (${rawError || 'unknown error'}).`;
          break;
      }

      return {
        success: false,
        biometryType,
        errorCode,
        error: errorMessage,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        biometryType,
        errorCode: 'BIOMETRIC_ERROR',
        error: err?.message || 'Biometric authentication encountered an error.',
        timestamp,
      };
    }
  }

  /**
   * Legacy method for backward compatibility with existing attendance components.
   */
  public static async authenticatePrompt(
    promptMessage = 'Authenticate to access Teacher Portal'
  ): Promise<{ success: boolean; error?: string }> {
    const res = await this.authenticate(promptMessage);
    return {
      success: res.success,
      error: res.error,
    };
  }
}

export default BiometricService;
