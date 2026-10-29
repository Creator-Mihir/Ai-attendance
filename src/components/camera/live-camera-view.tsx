import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator, Linking, AppState } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { CameraService } from '../../services/camera.service';

interface LiveCameraViewProps {
  facing?: 'front' | 'back';
  style?: any;
  onReadyChange?: (ready: boolean) => void;
}

export const LiveCameraView: React.FC<LiveCameraViewProps> = ({ facing = 'front', style, onReadyChange }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const initWebCamera = useCallback(async () => {
    setIsInitializing(true);
    setErrorMessage(null);
    try {
      await CameraService.initialize({ facing });
      const stream = CameraService.getActiveStream();
      if (stream) {
        setHasStream(true);
        onReadyChange?.(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
          CameraService.attachVideoElement(videoRef.current);
        }
      } else {
        setHasStream(false);
        onReadyChange?.(false);
        setErrorMessage('Camera stream could not be started.');
      }
    } catch (err: any) {
      console.warn('[LiveCameraView] Web camera init error:', err);
      setHasStream(false);
      onReadyChange?.(false);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setErrorMessage(
        isDenied
          ? 'Camera access was denied by your browser. Please allow camera permissions in the browser address bar and tap Retry.'
          : err?.message || 'Could not connect to camera hardware.'
      );
    } finally {
      setIsInitializing(false);
    }
  }, [facing, onReadyChange]);

  useEffect(() => {
    let isMounted = true;

    initWebCamera();

    const unsubscribe = CameraService.onStreamChange((stream) => {
      if (!isMounted) return;
      if (stream) {
        setHasStream(true);
        setErrorMessage(null);
        onReadyChange?.(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
          CameraService.attachVideoElement(videoRef.current);
        }
      } else {
        setHasStream(false);
        onReadyChange?.(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [initWebCamera, onReadyChange]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {/* Real Live HTML5 Video element */}
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el) {
              el.muted = true;
              CameraService.attachVideoElement(el);
            }
          }}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facing === 'front' ? 'scaleX(-1)' : 'none',
            zIndex: 1,
            backgroundColor: '#000000',
          } as any}
        />

        {/* Error or blocked permission card */}
        {errorMessage && (
          <View style={[styles.fallbackContainer, { zIndex: 5 }]}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📷</Text>
            <Text style={[styles.fallbackText, { color: '#F87171', marginBottom: 8, textAlign: 'center', paddingHorizontal: 20 }]}>
              {errorMessage}
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={initWebCamera}>
              <Text style={styles.permissionButtonText}>Retry Camera Access</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading / Fallback placeholder if stream not ready yet */}
        {!hasStream && !errorMessage && (
          <View style={styles.fallbackContainer}>
            <ActivityIndicator size="large" color="#6366F1" style={{ marginBottom: 12 }} />
            <Text style={styles.fallbackText}>Connecting to camera...</Text>
          </View>
        )}
      </View>
    );
  }

  // Native mobile (iOS & Android) with real expo-camera
  return <NativeCameraView facing={facing} style={style} onReadyChange={onReadyChange} />;
};

const NativeCameraView: React.FC<LiveCameraViewProps> = ({ facing = 'front', style, onReadyChange }) => {
  let ExpoCamera: any = null;
  try {
    ExpoCamera = require('expo-camera');
  } catch (err) {
    console.warn('[LiveCameraView] expo-camera load warning:', err);
  }

  const [permissionResponse, setPermissionResponse] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const nativeCameraRef = useRef<any>(null);

  const checkOrRequestPermissions = useCallback(async (explicitRequest = false) => {
    try {
      const getPerms = ExpoCamera?.getCameraPermissionsAsync || ExpoCamera?.Camera?.getCameraPermissionsAsync;
      const reqPerms = ExpoCamera?.requestCameraPermissionsAsync || ExpoCamera?.Camera?.requestCameraPermissionsAsync;

      let res: any = null;
      if (explicitRequest && reqPerms) {
        res = await reqPerms();
      } else if (getPerms) {
        res = await getPerms();
        // If not yet determined, prompt immediately
        if (!res?.granted && res?.canAskAgain !== false && reqPerms) {
          res = await reqPerms();
        }
      } else if (reqPerms) {
        res = await reqPerms();
      }

      setPermissionResponse(res || { granted: false, canAskAgain: true });
    } catch (err) {
      console.warn('[LiveCameraView] Permission check failed:', err);
      setPermissionResponse({ granted: false, canAskAgain: true });
    }
  }, [ExpoCamera]);

  useEffect(() => {
    checkOrRequestPermissions();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkOrRequestPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkOrRequestPermissions]);

  useEffect(() => {
    if (!isReady || !permissionResponse?.granted) {
      CameraService.registerNativeCaptureHandler(null);
      return () => {};
    }

    CameraService.registerNativeCaptureHandler(async (options) => {
      if (!isReady || !nativeCameraRef.current?.takePictureAsync) {
        throw new Error('CAMERA_UNAVAILABLE: native camera is not ready.');
      }
      const picture = await nativeCameraRef.current.takePictureAsync({
        quality: options?.quality ?? 0.88,
        base64: true,
        exif: false,
      });
      if (!picture?.uri || !picture.width || !picture.height || !picture.base64) {
        throw new Error('CAMERA_CAPTURE_FAILED: native camera returned no image file.');
      }
      const fileInfo = await FileSystem.getInfoAsync(picture.uri);
      if (!fileInfo.exists || typeof fileInfo.size !== 'number') {
        throw new Error('CAMERA_CAPTURE_FAILED: could not verify the captured image file.');
      }
      return {
        uri: picture.uri,
        base64: picture.base64,
        width: picture.width,
        height: picture.height,
        format: picture.format === 'png' ? 'png' : 'jpeg',
        facing: options?.facing ?? facing,
        timestamp: new Date().toISOString(),
        sizeBytes: fileInfo.size,
      };
    });

    return () => CameraService.registerNativeCaptureHandler(null);
  }, [facing, permissionResponse?.granted, isReady]);

  useEffect(() => {
    const ready = Boolean(permissionResponse?.granted && isReady && nativeCameraRef.current?.takePictureAsync);
    onReadyChange?.(ready);
  }, [permissionResponse?.granted, isReady, onReadyChange]);

  // 1. Still checking permission status
  if (permissionResponse === null) {
    return (
      <View style={[styles.container, styles.fallbackContainer, style]}>
        <ActivityIndicator size="large" color="#6366F1" style={{ marginBottom: 12 }} />
        <Text style={styles.fallbackText}>Checking camera access...</Text>
      </View>
    );
  }

  // 2. Camera permission denied or not yet granted
  if (!permissionResponse?.granted) {
    const canAskAgain = permissionResponse?.canAskAgain !== false;
    return (
      <View style={[styles.container, styles.fallbackContainer, style]}>
        <Text style={{ fontSize: 36, marginBottom: 8 }}>📷</Text>
        <Text style={[styles.fallbackText, { color: '#F87171', marginBottom: 6, textAlign: 'center', paddingHorizontal: 20 }]}>
          Camera access is required for attendance and face recognition
        </Text>
        <Text style={[styles.fallbackSubtext, { textAlign: 'center', marginBottom: 14, paddingHorizontal: 20 }]}>
          {canAskAgain
            ? 'Please allow camera permission to capture and verify face biometrics.'
            : 'Camera permission is blocked in system settings. Tap below to open settings and enable camera.'}
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            if (canAskAgain) {
              checkOrRequestPermissions(true);
            } else {
              Linking.openSettings();
            }
          }}
        >
          <Text style={styles.permissionButtonText}>
            {canAskAgain ? 'Allow Camera Access' : 'Open Device Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Permission granted: Mount native camera view
  const CameraComponent = ExpoCamera?.CameraView;

  if (CameraComponent) {
    return (
      <View style={[styles.container, style]}>
        <CameraComponent
          ref={nativeCameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={false}
          animateShutter={false}
          onCameraReady={() => setIsReady(true)}
          onMountError={(event: any) => {
            console.error('[LiveCameraView] Native camera mount failed:', event?.message || event);
            setIsReady(false);
          }}
        />
        {!isReady && (
          <View style={styles.fallbackContainer}>
            <ActivityIndicator size="large" color="#6366F1" style={{ marginBottom: 12 }} />
            <Text style={styles.fallbackText}>Starting camera hardware...</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.fallbackContainer, style]}>
      <Text style={styles.loadingPulse}>📷</Text>
      <Text style={styles.fallbackText}>Camera component unavailable.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#050811',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#080D1A',
    zIndex: 2,
    padding: 16,
  },
  loadingPulse: {
    fontSize: 48,
    marginBottom: 8,
  },
  fallbackText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  fallbackSubtext: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
  },
  permissionButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 4,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default LiveCameraView;
