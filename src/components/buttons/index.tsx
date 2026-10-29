import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/colors';

export const PrimaryButton: React.FC<{
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: any;
  variant?: 'primary' | 'danger' | 'success';
}> = ({ title, onPress, loading, disabled, icon, style, variant = 'primary' }) => {
  const getBgColor = () => {
    if (disabled) return '#334155';
    if (variant === 'danger') return '#EF4444';
    if (variant === 'success') return '#10B981';
    return '#4F46E5';
  };

  return (
    <TouchableOpacity
      style={[styles.primaryBtn, { backgroundColor: getBgColor() }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <View style={styles.btnContent}>
          {icon ? <View style={styles.btnIcon}>{icon}</View> : null}
          <Text style={styles.primaryBtnText}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const SecondaryButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: any;
}> = ({ title, onPress, disabled, icon, style }) => {
  return (
    <TouchableOpacity
      style={[styles.secondaryBtn, disabled && styles.disabledBtn, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.btnContent}>
        {icon ? <View style={styles.btnIcon}>{icon}</View> : null}
        <Text style={styles.secondaryBtnText}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const BiometricButton: React.FC<{
  onPress: () => void;
  title?: string;
}> = ({ onPress, title = 'Authenticate with Face / Touch ID' }) => {
  return (
    <TouchableOpacity style={styles.biometricBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.biometricIcon}>🔒</Text>
      <Text style={styles.biometricText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  secondaryBtnText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: {
    marginRight: 8,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  biometricIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  biometricText: {
    color: '#A5B4FC',
    fontSize: 14,
    fontWeight: '600',
  }
});
