export interface PermissionStatus {
  camera: boolean;
  location: boolean;
  biometric: boolean;
}

export async function checkSystemPermissions(): Promise<PermissionStatus> {
  let camera = false;
  let location = false;

  if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
    try {
      const permission = await navigator.permissions?.query({ name: 'camera' as any });
      camera = permission ? permission.state === 'granted' : false;
    } catch {
      camera = false;
    }
  } else {
    try {
      const Camera = require('expo-camera');
      const getPermissions = Camera.getCameraPermissionsAsync || Camera.Camera?.getCameraPermissionsAsync;
      camera = getPermissions ? Boolean((await getPermissions()).granted) : false;
    } catch {
      camera = false;
    }
  }

  try {
    const Location = require('expo-location');
    if (typeof Location.getForegroundPermissionsAsync === 'function') {
      location = Boolean((await Location.getForegroundPermissionsAsync()).granted);
    }
  } catch {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const permission = await navigator.permissions?.query({ name: 'geolocation' as any });
        location = permission ? permission.state !== 'denied' : false;
      } catch {
        location = false;
      }
    }
  }

  return { camera, location, biometric: false };
}

export async function requestCameraPermission(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }
  try {
    const Camera = require('expo-camera');
    const request = Camera.requestCameraPermissionsAsync || Camera.Camera?.requestCameraPermissionsAsync;
    return request ? Boolean((await request()).granted) : false;
  } catch {
    return false;
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const Location = require('expo-location');
    if (typeof Location.requestForegroundPermissionsAsync === 'function') {
      return (await Location.requestForegroundPermissionsAsync()).status === 'granted';
    }
  } catch {
    // Continue to the browser provider when Expo Location is unavailable.
  }

  return new Promise((resolve) => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 5000 }
      );
    } else {
      resolve(false);
    }
  });
}
