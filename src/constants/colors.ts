export const Colors = {
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  accent: {
    cyan: '#06B6D4',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    purple: '#8B5CF6',
  },
  dark: {
    background: '#0B0F19',
    surface: '#111827',
    surfaceElevated: '#1F2937',
    border: '#374151',
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
    textDim: '#6B7280',
  },
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    textDim: '#94A3B8',
  },
  status: {
    present: '#10B981',
    absent: '#EF4444',
    late: '#F59E0B',
    halfDay: '#8B5CF6',
    pendingSync: '#3B82F6',
    synced: '#10B981',
    failedSync: '#EF4444',
  },
  geofence: {
    inside: '#10B981',
    outside: '#EF4444',
    warning: '#F59E0B',
    pulse: 'rgba(99, 102, 241, 0.25)',
  }
} as const;

export default Colors;
