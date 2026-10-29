import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AttendanceRecord, AttendanceSummary } from '../../types/attendance';
import { formatTime, formatDate } from '../../utils/date';
import { Badge } from '../ui';

export const SyncStatusBar: React.FC<{
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSyncPress: () => void;
  onToggleNetwork?: () => void;
}> = ({ isOnline, pendingCount, isSyncing, onSyncPress, onToggleNetwork }) => {
  return (
    <View style={styles.syncContainer}>
      <TouchableOpacity
        style={styles.networkStatusPill}
        onPress={onToggleNetwork}
        activeOpacity={0.7}
      >
        <View style={[styles.networkDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
        <Text style={styles.networkText}>{isOnline ? 'Online' : 'Offline Mode'}</Text>
        <Text style={styles.toggleHint}>(Tap to toggle)</Text>
      </TouchableOpacity>

      <View style={styles.syncRight}>
        {pendingCount > 0 ? (
          <TouchableOpacity
            style={styles.syncBadgeBtn}
            onPress={onSyncPress}
            disabled={isSyncing || !isOnline}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
            ) : null}
            <Text style={styles.syncBadgeText}>
              {pendingCount} unsynced {isOnline ? '• Sync now' : '• Stored local'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.syncedAllText}>✓ All records synced</Text>
        )}
      </View>
    </View>
  );
};

export const AttendanceHistoryList: React.FC<{
  items: AttendanceSummary[];
  onSelect?: (item: AttendanceSummary) => void;
}> = ({ items }) => {
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No attendance records recorded yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.historyContainer}>
      {items.map((item, idx) => {
        const badgeVariant =
          item.status === 'PRESENT'
            ? 'success'
            : item.status === 'LATE'
            ? 'warning'
            : 'error';

        return (
          <View key={item.date || idx} style={styles.historyItem}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
              <View style={styles.timesRow}>
                <Text style={styles.historyPunch}>
                  In: {item.checkIn ? formatTime(item.checkIn.timestamp) : '--:--'}
                </Text>
                <Text style={styles.historyPunch}>
                  • Out: {item.checkOut ? formatTime(item.checkOut.timestamp) : '--:--'}
                </Text>
              </View>
            </View>

            <View style={styles.historyRight}>
              <Badge label={item.status} variant={badgeVariant} />
              {item.checkIn?.syncStatus === 'SYNCED' ? (
                <Text style={styles.syncMiniBadge}>Cloud Synced</Text>
              ) : item.checkIn ? (
                <Text style={styles.syncMiniBadgePending}>Pending Sync</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  networkStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#EF4444',
  },
  networkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  toggleHint: {
    fontSize: 10,
    color: '#64748B',
    marginLeft: 4,
  },
  syncRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#312E81',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncBadgeText: {
    color: '#C7D2FE',
    fontSize: 11,
    fontWeight: '700',
  },
  syncedAllText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  historyContainer: {
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  timesRow: {
    flexDirection: 'row',
  },
  historyPunch: {
    fontSize: 12,
    color: '#94A3B8',
    marginRight: 6,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  syncMiniBadge: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 4,
  },
  syncMiniBadgePending: {
    fontSize: 10,
    color: '#F59E0B',
    marginTop: 4,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  }
});

export * from './SyncQueueModal';
