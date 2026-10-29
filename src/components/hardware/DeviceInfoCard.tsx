import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { DeviceService } from '../../services/device.service';
import { DeviceInfo } from '../../types/hardware';
import { Card, Badge } from '../ui';

export interface DeviceInfoCardProps {
  onRefresh?: (info: DeviceInfo) => void;
}

export const DeviceInfoCard: React.FC<DeviceInfoCardProps> = ({ onRefresh }) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInfo = async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const info = await DeviceService.getDeviceInfo(forceRefresh);
      setDeviceInfo(info);
      if (onRefresh) onRefresh(info);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInfo();
  }, []);

  if (loading && !deviceInfo) {
    return (
      <Card style={styles.cardContainer}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>Reading device hardware diagnostics...</Text>
        </View>
      </Card>
    );
  }

  if (!deviceInfo) {
    return null;
  }

  return (
    <Card style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Device Security & Hardware</Text>
          <Text style={styles.subtitle}>ID: {deviceInfo.deviceId}</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadInfo(true)}
          disabled={isRefreshing}
          activeOpacity={0.7}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#38BDF8" />
          ) : (
            <Text style={styles.refreshText}>↻ Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Integrity Badges */}
      <View style={styles.badgeRow}>
        <Badge
          label={deviceInfo.integrityPassed ? 'System Secure' : 'Integrity Unverified'}
          variant={deviceInfo.integrityPassed ? 'success' : 'error'}
        />
        <Badge
          label={deviceInfo.isRootedOrJailbroken === null ? 'Root Status Unknown' : deviceInfo.isRootedOrJailbroken ? 'Root Detected' : 'No Root Detected'}
          variant={deviceInfo.isRootedOrJailbroken ? 'error' : 'neutral'}
        />
        <Badge
          label={deviceInfo.isMockLocationActive === null ? 'Mock GPS Status Unknown' : deviceInfo.isMockLocationActive ? 'Mock GPS Active' : 'No Mock Signal Detected'}
          variant={deviceInfo.isMockLocationActive ? 'error' : 'neutral'}
        />
      </View>

      {/* Hardware Details Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.gridItem}>
          <Text style={styles.itemLabel}>Model</Text>
          <Text style={styles.itemValue}>{deviceInfo.deviceModel}</Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.itemLabel}>OS / Platform</Text>
          <Text style={styles.itemValue}>
            {deviceInfo.osName} {deviceInfo.osVersion}
          </Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.itemLabel}>Biometrics</Text>
          <Text style={styles.itemValue}>
            {deviceInfo.supportedBiometrics.length > 0
              ? deviceInfo.supportedBiometrics.join(', ')
              : 'None'}
          </Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.itemLabel}>App Version</Text>
          <Text style={styles.itemValue}>{deviceInfo.appVersion}</Text>
        </View>
      </View>

      {/* Sensor List */}
      <View style={styles.sensorContainer}>
        <Text style={styles.sensorHeading}>Reported Hardware Sensors</Text>
        <View style={styles.sensorTags}>
          {deviceInfo.sensorsAvailable.map((sensor, idx) => (
            <View key={idx} style={styles.sensorTag}>
              <Text style={styles.sensorTagText}>✓ {sensor}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#131B2E',
    borderColor: '#1E293B',
    marginBottom: 16,
    padding: 16,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  refreshButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  refreshText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  gridItem: {
    width: '46%',
  },
  itemLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  itemValue: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '700',
    marginTop: 2,
  },
  sensorContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 12,
  },
  sensorHeading: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 8,
  },
  sensorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sensorTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sensorTagText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default DeviceInfoCard;
