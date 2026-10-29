import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { HardwarePermissionStatus } from '../../types/hardware';
import { DeviceService } from '../../services/device.service';
import { Card, Badge } from '../ui';

export interface PermissionPromptProps {
  permissions?: HardwarePermissionStatus;
  onPermissionsUpdated?: (status: HardwarePermissionStatus) => void;
  onContinue?: () => void;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({
  permissions: initialPermissions,
  onPermissionsUpdated,
  onContinue,
}) => {
  const [permissions, setPermissions] = useState<HardwarePermissionStatus>(
    initialPermissions || { camera: false, location: false, biometric: false }
  );
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestAll = async () => {
    setIsRequesting(true);
    try {
      const updated = await DeviceService.requestPermissions();
      setPermissions(updated);
      if (onPermissionsUpdated) {
        onPermissionsUpdated(updated);
      }
      if (updated.camera && updated.location && updated.biometric && onContinue) {
        onContinue();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const allGranted = permissions.camera && permissions.location && permissions.biometric;

  return (
    <Card style={styles.cardContainer}>
      <Text style={styles.title}>Hardware Access Required</Text>
      <Text style={styles.description}>
        To guarantee attendance security and anti-spoofing verification, please allow access to camera, location, and biometrics.
      </Text>

      {/* Permission Items */}
      <View style={styles.list}>
        {/* Camera */}
        <View style={styles.permissionItem}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>📷</Text>
          </View>
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemTitle}>Camera Access</Text>
            <Text style={styles.itemSub}>Used for secure facial scan & liveness detection</Text>
          </View>
          <Badge
            label={permissions.camera ? 'Granted' : 'Required'}
            variant={permissions.camera ? 'success' : 'warning'}
          />
        </View>

        {/* GPS Location */}
        <View style={styles.permissionItem}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>📍</Text>
          </View>
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemTitle}>Campus Geofence (GPS)</Text>
            <Text style={styles.itemSub}>Confirms your presence within the school perimeter</Text>
          </View>
          <Badge
            label={permissions.location ? 'Granted' : 'Required'}
            variant={permissions.location ? 'success' : 'warning'}
          />
        </View>

        {/* Biometrics */}
        <View style={styles.permissionItem}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🛡️</Text>
          </View>
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemTitle}>Biometric Verification</Text>
            <Text style={styles.itemSub}>Protects profile and confirms punch identity</Text>
          </View>
          <Badge
            label={permissions.biometric ? 'Granted' : 'Required'}
            variant={permissions.biometric ? 'success' : 'warning'}
          />
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionButton, allGranted && styles.actionButtonGranted]}
        onPress={allGranted ? onContinue : handleRequestAll}
        disabled={isRequesting}
        activeOpacity={0.8}
      >
        {isRequesting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.actionButtonText}>
            {allGranted ? 'Continue to Attendance →' : 'Grant Hardware Permissions'}
          </Text>
        )}
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#131B2E',
    borderColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 20,
  },
  list: {
    gap: 14,
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  itemTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonGranted: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PermissionPrompt;
