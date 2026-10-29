import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';
import { useSync } from '../../hooks/useSync';

export interface OfflineBannerProps {
  onTogglePress?: () => void;
  onQueuePress?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onTogglePress, onQueuePress }) => {
  const { isOnline, toggleNetwork } = useNetwork();
  const { pendingCount } = useSync();

  if (isOnline) {
    return null;
  }

  const handleToggle = () => {
    if (onTogglePress) {
      onTogglePress();
    } else {
      toggleNetwork();
    }
  };

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>☁✕</Text>
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>Offline Mode</Text>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>Local Storage Active</Text>
            </View>
          </View>
          <Text style={styles.subtitleText}>
            Attendance will sync automatically when reconnected.
          </Text>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.pendingText}>
          {pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? 'record' : 'records'} waiting to sync`
            : 'Ready to record attendance locally'}
        </Text>

        <View style={styles.actionsRow}>
          {onQueuePress && pendingCount > 0 ? (
            <TouchableOpacity onPress={onQueuePress} style={styles.queueBtn}>
              <Text style={styles.queueBtnText}>View Queue</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity onPress={handleToggle} style={styles.toggleBtn}>
            <Text style={styles.toggleBtnText}>Simulate Online</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#161F36',
    borderWidth: 1,
    borderColor: '#2A3958',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '800',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  badgePill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A5B4FC',
  },
  subtitleText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueBtn: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  queueBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#818CF8',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#312E81',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C7D2FE',
  },
});

export default OfflineBanner;
