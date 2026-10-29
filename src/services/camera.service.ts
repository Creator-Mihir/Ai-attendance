import { checkSystemPermissions, requestCameraPermission } from '../utils/permissions';
import { CameraCaptureResult, CameraFacing, CameraOptions } from '../types/hardware';
import { HARDWARE_CONFIG } from '../constants/hardware';
import { Platform } from 'react-native';

type NativeCaptureHandler = (options?: CameraOptions) => Promise<CameraCaptureResult>;

export class CameraService {
  private static currentFacing: CameraFacing = HARDWARE_CONFIG.DEFAULT_CAMERA_FACING;
  private static isInitialized = false;
  private static activeStream: any = null;
  private static activeVideoElement: HTMLVideoElement | null = null;
  private static listeners: Array<(stream: any) => void> = [];
  private static nativeCaptureHandler: NativeCaptureHandler | null = null;

  public static registerNativeCaptureHandler(handler: NativeCaptureHandler | null): void {
    this.nativeCaptureHandler = handler;
  }

  /**
   * Initializes camera hardware and requests permission if needed.
   */
  public static async initialize(options?: { facing?: CameraFacing }): Promise<boolean> {
    if (options?.facing) {
      this.currentFacing = options.facing;
    }

    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    // Native capture is provided by the mounted Expo CameraView. Do not report
    // a stream here: the view owns the real platform camera session.
    if (Platform.OS !== 'web') {
      this.isInitialized = true;
      return true;
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      const tracks = this.activeStream?.getTracks?.() || [];
      const isLive = tracks.length > 0 && tracks.some((t: any) => t.readyState === 'live');

      if (!isLive) {
        try {
          this.activeStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: this.currentFacing === 'front' ? 'user' : 'environment',
              width: { ideal: HARDWARE_CONFIG.DEFAULT_IMAGE_WIDTH },
              height: { ideal: HARDWARE_CONFIG.DEFAULT_IMAGE_HEIGHT },
            },
            audio: false,
          });
        } catch (constraintErr) {
          console.warn('[CameraService] Constrained getUserMedia failed, trying fallback video constraints:', constraintErr);
          this.activeStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        this.listeners.forEach((cb) => {
          try { cb(this.activeStream); } catch { /* listener isolation */ }
        });

        if (this.activeVideoElement && this.activeStream) {
          try {
            this.activeVideoElement.srcObject = this.activeStream;
            this.activeVideoElement.play().catch(() => {});
          } catch {}
        }
      }
    } else {
      throw new Error('CAMERA_UNAVAILABLE: real camera capture is not wired for this platform yet.');
    }

    this.isInitialized = Boolean(this.activeStream);
    if (!this.isInitialized) throw new Error('CAMERA_UNAVAILABLE: no active camera stream.');
    return true;
  }

  public static getActiveStream(): any {
    return this.activeStream;
  }

  public static attachVideoElement(el: HTMLVideoElement | null): void {
    this.activeVideoElement = el;
    if (el && this.activeStream) {
      try {
        el.srcObject = this.activeStream;
        el.play().catch(() => { });
      } catch { }
    }
  }

  public static onStreamChange(cb: (stream: any) => void): () => void {
    this.listeners.push(cb);
    if (this.activeStream) {
      try {
        cb(this.activeStream);
      } catch { }
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public static async checkPermission(): Promise<boolean> {
    const status = await checkSystemPermissions();
    return status.camera;
  }

  public static async requestPermission(): Promise<boolean> {
    return requestCameraPermission();
  }

  public static isCameraAvailable(): boolean {
    return Platform.OS !== 'web' || (typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia));
  }

  public static getCurrentFacing(): CameraFacing {
    return this.currentFacing;
  }

  public static switchCamera(facing?: CameraFacing): CameraFacing {
    this.currentFacing = facing || (this.currentFacing === 'front' ? 'back' : 'front');
    return this.currentFacing;
  }

  /**
   * Captures a photo:
   * If real browser webcam is streaming, grabs the actual frame from video onto canvas.
   * Fails closed unless an actual camera frame is available.
   */
  public static async takePhoto(options?: CameraOptions): Promise<CameraCaptureResult> {
    const facing = options?.facing || this.currentFacing;
    const format = options?.format || 'jpeg';
    const timestamp = new Date().toISOString();

    if (Platform.OS !== 'web') {
      if (!this.nativeCaptureHandler) {
        throw new Error('CAMERA_UNAVAILABLE: native camera view has not reported ready. Wait for the camera preview before capturing.');
      }
      return this.nativeCaptureHandler(options);
    }

    if (!this.isInitialized || !this.activeStream) {
      throw new Error('CAMERA_UNAVAILABLE: camera is not initialized.');
    }

    let realBase64: string | undefined;

    // Check if we have an active HTML5 video element on web
    if (
      typeof document !== 'undefined' &&
      this.activeVideoElement &&
      this.activeVideoElement.videoWidth > 0 &&
      this.activeVideoElement.videoHeight > 0
    ) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = this.activeVideoElement.videoWidth;
        canvas.height = this.activeVideoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Mirror back horizontally if front camera was mirrored for preview
          ctx.drawImage(this.activeVideoElement, 0, 0, canvas.width, canvas.height);
          realBase64 = canvas.toDataURL(`image/${format}`, 0.88);
        }
      } catch (err) {
        throw new Error(`CAMERA_CAPTURE_FAILED: ${err instanceof Error ? err.message : 'Could not capture camera frame.'}`);
      }
    }

    if (!realBase64) {
      throw new Error('CAMERA_CAPTURE_FAILED: a live browser camera frame is not available.');
    }

    const actualWidth = this.activeVideoElement!.videoWidth;
    const actualHeight = this.activeVideoElement!.videoHeight;
    const captureResult: CameraCaptureResult = {
      uri: realBase64,
      base64: realBase64,
      width: actualWidth,
      height: actualHeight,
      format,
      facing,
      timestamp,
      sizeBytes: Math.floor((realBase64.length - realBase64.indexOf(',') - 1) * 3 / 4),
    };

    return captureResult;
  }

  public static async captureFrame(): Promise<string> {
    const photo = await this.takePhoto();
    return photo.base64;
  }

  /**
   * Fully stops all camera hardware tracks to turn off the device camera indicator.
   */
  public static stop(): void {
    if (this.activeStream) {
      try {
        this.activeStream.getTracks?.().forEach((t: any) => {
          try {
            t.stop();
          } catch { }
        });
      } catch { }
      this.activeStream = null;
    }

    if (this.activeVideoElement) {
      try {
        this.activeVideoElement.srcObject = null;
      } catch { }
      this.activeVideoElement = null;
    }

    this.isInitialized = false;
    this.nativeCaptureHandler = null;
    this.listeners.forEach((cb) => {
      try {
        cb(null);
      } catch { }
    });
  }
}

export default CameraService;
