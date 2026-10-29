export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    SEND_OTP: '/auth/otp/send',
    VERIFY_OTP: '/auth/otp/verify',
    REFRESH_TOKEN: '/auth/refresh',
    REGISTER_DEVICE: '/auth/device/register',
  },
  TEACHER: {
    PROFILE: '/teacher/profile',
    UPDATE_PROFILE: '/teacher/profile/update',
    REGISTER_FACE: '/teacher/face/register',
    DELETE_FACE: '/teacher/face/delete',
  },
  ATTENDANCE: {
    PUNCH: '/attendance/punch',
    HISTORY: '/attendance/history',
    STATS: '/attendance/stats',
    GEOFENCE_ZONES: '/attendance/geofence-zones',
  },
  SYNC: {
    BATCH: '/sync/batch',
    STATUS: '/sync/status',
  }
} as const;
