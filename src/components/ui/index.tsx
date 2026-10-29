import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { Colors } from '../../constants/colors';

export const AppHeader: React.FC<{
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onBack?: () => void;
}> = ({ title, subtitle, rightElement, onBack }) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightElement ? <View>{rightElement}</View> : null}
    </View>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  style?: any;
  variant?: 'elevated' | 'glass' | 'bordered';
}> = ({ children, style, variant = 'elevated' }) => {
  return (
    <View style={[styles.card, variant === 'glass' && styles.cardGlass, style]}>
      {children}
    </View>
  );
};

export const Badge: React.FC<{
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  style?: any;
}> = ({ label, variant = 'info', style }) => {
  const getColors = () => {
    switch (variant) {
      case 'success': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: '#10B981' };
      case 'warning': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: '#F59E0B' };
      case 'error': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: '#EF4444' };
      case 'neutral': return { bg: 'rgba(100, 116, 139, 0.2)', text: '#94A3B8', border: '#475569' };
      case 'info':
      default: return { bg: 'rgba(99, 102, 241, 0.15)', text: '#818CF8', border: '#6366F1' };
    }
  };
  const c = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }, style]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{label}</Text>
    </View>
  );
};

export const CustomInput: React.FC<{
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  style?: any;
}> = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, error, style }) => {
  return (
    <View style={[styles.inputWrapper, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
};

export const ProgressBar: React.FC<{ progress: number; color?: string }> = ({
  progress,
  color = '#6366F1'
}) => {
  const clamp = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamp * 100}%`, backgroundColor: color }]} />
    </View>
  );
};

export const Avatar: React.FC<{
  name: string;
  size?: number;
  uri?: string;
}> = ({ name, size = 48, uri }) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() || 'TA';

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0B0F19',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  backArrow: {
    color: '#F8FAFC',
    fontSize: 24,
    lineHeight: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  cardGlass: {
    backgroundColor: 'rgba(19, 27, 46, 0.85)',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F8FAFC',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  avatar: {
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
  }
});

export * from './OfflineBanner';
export * from './StatusIndicator';
