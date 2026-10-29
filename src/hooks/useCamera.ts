import { useState, useEffect, useCallback } from 'react';
import { CameraService } from '../services/camera.service';
import { CameraCaptureResult, CameraFacing, CameraOptions } from '../types/hardware';

export function useCamera(initialFacing: CameraFacing = 'front') {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [photo, setPhoto] = useState<CameraCaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>(initialFacing);

  useEffect(() => {
    CameraService.checkPermission().then((granted) => {
      setHasPermission(granted);
    });
  }, []);

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      const granted = await CameraService.requestPermission();
      setHasPermission(granted);
      setIsLoading(false);
      return granted;
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to request camera permission');
      return false;
    }
  }, []);

  const capture = useCallback(async (options?: CameraOptions) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await CameraService.takePhoto({ facing, ...options });
      setPhoto(result);
      setIsLoading(false);
      return result;
    } catch (err: any) {
      setIsLoading(false);
      const errMsg = err?.message || 'Failed to capture photo';
      setError(errMsg);
      throw err;
    }
  }, [facing]);

  const switchCamera = useCallback((newFacing?: CameraFacing) => {
    const updated = CameraService.switchCamera(newFacing);
    setFacing(updated);
    return updated;
  }, []);

  const reset = useCallback(() => {
    setPhoto(null);
    setError(null);
  }, []);

  return {
    photo,
    capture,
    error,
    isLoading,
    hasPermission,
    requestPermission,
    switchCamera,
    facing,
    reset,
    // Backward compatibility for existing scanner overlays
    isCapturing: isLoading,
    captureFrame: CameraService.captureFrame,
  };
}

export default useCamera;
