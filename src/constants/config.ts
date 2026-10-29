function ensureApiPath(url: string): string {
  const normalized = url.replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

export function resolveApiBaseUrl(): string {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const configuredUrl = envApiUrl ? ensureApiPath(envApiUrl) : undefined;

  let platform = 'unknown';
  let expoHost: string | null = null;
  let isPhysicalDevice = true;
  try {
    const { Platform } = require('react-native');
    platform = Platform.OS;
  } catch {}

  // Expo's development host is the computer running Metro and, in this setup,
  // the local API. A physical phone cannot reach that computer through localhost.
  try {
    const Constants = require('expo-constants')?.default || require('expo-constants');
    isPhysicalDevice = Constants?.isDevice !== false;
    const hostUri =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest?.debuggerHost ||
      Constants?.manifest2?.extra?.expoClient?.hostUri;
    if (hostUri) {
      const parsed = new URL(String(hostUri).includes('://') ? String(hostUri) : `http://${hostUri}`);
      if (parsed.hostname && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        expoHost = parsed.hostname;
      }
    }
  } catch {}

  if (configuredUrl) {
    try {
      const configured = new URL(configuredUrl);
      const isLoopback = configured.hostname === 'localhost' || configured.hostname === '127.0.0.1';
      if (isLoopback && platform !== 'web') {
        if (expoHost) return `http://${expoHost}:${configured.port || '3001'}/api`;
        if (platform === 'android' && !isPhysicalDevice) return `http://10.0.2.2:${configured.port || '3001'}/api`;
      }
    } catch {
      // Keep an invalid explicit value visible so connection diagnostics can explain it.
    }
    return ensureApiPath(configuredUrl);
  }

  if (platform !== 'web') {
    if (expoHost) return `http://${expoHost}:3001/api`;
    if (platform === 'android' && !isPhysicalDevice) return 'http://10.0.2.2:3001/api';
    // Deployed Render production backend URL.
    return 'https://ai-attendance-backend-peh3.onrender.com/api';
  }

  // In a browser, localhost is the same computer running the browser.
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:3001/api`;
  }

  return 'http://localhost:3001/api';
}

export const AppConfig = {
  appName: 'AI Teacher Attendance',
  appVersion: '1.0.0',
  buildNumber: 101,
  apiBaseUrl: resolveApiBaseUrl(),
  mockMode: false,
  mockDelayMs: 250,

  // Geofence configuration for the school campus
  schoolCampus: {
    name: 'Metropolitan Science Academy - Main Campus',
    latitude: 23.2135,
    longitude: 77.3885,
    radiusMeters: 150, // 150m radius
    allowedToleranceMeters: 30, // 30m GPS drift grace
  },

  // Verification thresholds
  verification: {
    minLivenessScore: 0.85,
    minFaceMatchScore: 0.82,
    maxAllowedGpsAccuracyMeters: 50,
    maxClockDriftSeconds: 60,
    livenessChallengeTimeoutMs: 12000,
    maxLivenessRetries: 3,
    // The project owner explicitly permits existing face + spoken-liveness
    // checks on devices with no front-camera depth capability. A device that
    // reports depth support must still produce and pass real depth evidence.
    depthPolicy: 'OPTIONAL' as const,
  },

  // Offline and Sync parameters
  sync: {
    autoSyncIntervalMs: 30000, // 30 seconds
    maxBatchSize: 15,
    maxRetries: 5,
    backoffBaseMs: 2000,
  },

  // Attendance timing windows
  shiftTimings: {
    morningCheckInStart: '07:30',
    morningCheckInOnTime: '08:30',
    morningLateCutoff: '09:00',
    afternoonCheckOutMin: '15:30',
  }
} as const;

export default AppConfig;
