import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'syncing' | 'failed';
  label?: string;
  size?: number;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 8,
}) => {
  const getColor = () => {
    switch (status) {
      case 'online':
        return '#10B981'; // Emerald
      case 'offline':
        return '#F59E0B'; // Amber (calm, not error red)
      case 'syncing':
        return '#6366F1'; // Indigo
      case 'failed':
        return '#EF4444'; // Red
      default:
        return '#94A3B8';
    }
  };

  const color = getColor();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      />
      {label && <Text style={[styles.label, { color }]}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default StatusIndicator;
