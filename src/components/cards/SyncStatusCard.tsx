import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card, Badge } from '../ui';
import { StatusIndicator } from '../ui/StatusIndicator';
import { formatTime } from '../../utils/date';

export interface SyncStatusCardProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTimestamp?: string;
  onSyncPress: () => void;
  onToggleNetworkPress: () => void;
  onViewQueuePress?: () => void;
  onRetryFailedPress?: () => void;
}

export const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  failedCount,
  lastSyncTimestamp,
  onSyncPress,
  onToggleNetworkPress,
  onViewQueuePress,
  onRetryFailedPress,
}) => {
  const getStatusText = () => {
    if (!isOnline) {
      return pendingCount > 0
        ? `${pendingCount} ${pendingCount === 1 ? 'record' : 'records'} waiting to sync`
        : 'Attendance will sync automatically';
    }
    if (isSyncing) {
      return 'Synchronizing records with cloud...';
    }
    if (pendingCount > 0) {
      return `${pendingCount} ${pendingCount === 1 ? 'record' : 'records'} waiting to sync`;
    }
    return 'All data synced';
  };

  const getSubtext = () => {
    if (!isOnline) {
      return 'Saved safely in local SQLite storage.';
    }
    if (lastSyncTimestamp) {
      return `Last cloud check: ${formatTime(lastSyncTimestamp)}`;
    }
    return 'Cloud backend active and connected.';
  };

  return (
    <Card style={styles.cardContainer}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>Cloud Synchronization</Text>
          <Text style={styles.cardSubtitle}>{getSubtext()}</Text>
        </View>

        <TouchableOpacity onPress={onToggleNetworkPress} activeOpacity={0.7} style={styles.statusPill}>
          <StatusIndicator
            status={isSyncing ? 'syncing' : isOnline ? 'online' : 'offline'}
            label={isOnline ? 'Online' : 'Offline'}
          />
        </TouchableOpacity>
      </View>

      {/* Main Status Callout */}
      <View
        style={[
          styles.calloutBox,
          !isOnline
            ? styles.calloutOffline
            : pendingCount > 0
            ? styles.calloutPending
            : styles.calloutSynced,
        ]}
      >
        <View style={styles.calloutLeft}>
          <Text
            style={[
              styles.calloutStatus,
              !isOnline
                ? styles.textOffline
                : pendingCount > 0
                ? styles.textPending
                : styles.textSynced,
            ]}
          >
            {getStatusText()}
          </Text>
          <Text style={styles.calloutDesc}>
            {!isOnline
              ? 'Local SQLite database records will dispatch when connection returns.'
              : pendingCount > 0
              ? 'Records ready to dispatch to attendance backend.'
              : 'Local SQLite database is in sync with server.'}
          </Text>
        </View>

        {failedCount > 0 && (
          <Badge label={`${failedCount} Failed`} variant="error" style={{ alignSelf: 'center' }} />
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.syncBtn, (isSyncing || !isOnline || pendingCount === 0) && styles.syncBtnDisabled]}
          onPress={onSyncPress}
          disabled={isSyncing || !isOnline || pendingCount === 0}
          activeOpacity={0.8}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
          ) : (
            <Text style={styles.syncBtnIcon}>↻</Text>
          )}
          <Text style={styles.syncBtnText}>
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>

        {onViewQueuePress && (
          <TouchableOpacity
            style={styles.queueBtn}
            onPress={onViewQueuePress}
            activeOpacity={0.7}
          >
            <Text style={styles.queueBtnText}>
              Queue ({pendingCount})
            </Text>
          </TouchableOpacity>
        )}

        {failedCount > 0 && onRetryFailedPress && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onRetryFailedPress}
            activeOpacity={0.7}
          >
            <Text style={styles.retryBtnText}>Retry Failed</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#131B2E',
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  calloutBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calloutSynced: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  calloutPending: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  calloutOffline: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  calloutLeft: {
    flex: 1,
  },
  calloutStatus: {
    fontSize: 14,
    fontWeight: '700',
  },
  textSynced: {
    color: '#10B981',
  },
  textPending: {
    color: '#818CF8',
  },
  textOffline: {
    color: '#F59E0B',
  },
  calloutDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtnDisabled: {
    backgroundColor: '#1E293B',
    opacity: 0.6,
  },
  syncBtnIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 6,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  queueBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  queueBtnText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 13,
  },
  retryBtn: {
    backgroundColor: '#451A1A',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  retryBtnText: {
    color: '#FCA5A5',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default SyncStatusCard;
