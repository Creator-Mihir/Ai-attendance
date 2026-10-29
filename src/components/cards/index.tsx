import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Badge } from '../ui';
import { AttendanceRecord, AttendanceStats } from '../../types/attendance';
import { formatTime, formatDate } from '../../utils/date';

export const TodayAttendanceCard: React.FC<{
  checkIn?: AttendanceRecord;
  checkOut?: AttendanceRecord;
  onPunchPress: () => void;
  isInsideGeofence?: boolean;
}> = ({ checkIn, checkOut, onPunchPress, isInsideGeofence }) => {
  return (
    <Card style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardHeaderTitle}>Today's Status</Text>
          <Text style={styles.cardHeaderDate}>{formatDate()}</Text>
        </View>
        <Badge
          label={checkOut ? 'COMPLETED' : checkIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
          variant={checkOut ? 'neutral' : checkIn ? 'success' : 'warning'}
        />
      </View>

      <View style={styles.punchesRow}>
        <View style={styles.punchItem}>
          <Text style={styles.punchLabel}>Morning In</Text>
          <Text style={styles.punchTime}>{checkIn ? formatTime(checkIn.timestamp) : '--:-- --'}</Text>
          <Text style={styles.punchMeta}>
            {checkIn ? (checkIn.status === 'LATE' ? 'Late Arrival' : 'On Time') : 'Expected 08:30 AM'}
          </Text>
        </View>

        <View style={styles.punchDivider} />

        <View style={styles.punchItem}>
          <Text style={styles.punchLabel}>Evening Out</Text>
          <Text style={styles.punchTime}>{checkOut ? formatTime(checkOut.timestamp) : '--:-- --'}</Text>
          <Text style={styles.punchMeta}>
            {checkOut ? 'Shift Completed' : 'Expected 03:30 PM'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.actionBtn,
          checkOut ? styles.actionBtnDone : checkIn ? styles.actionBtnCheckOut : styles.actionBtnCheckIn
        ]}
        onPress={onPunchPress}
        disabled={Boolean(checkOut)}
      >
        <Text style={styles.actionBtnText}>
          {checkOut ? '✓ Attendance Completed Today' : checkIn ? 'Mark Check-Out' : 'Mark Morning Check-In'}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

export const StatsOverviewCard: React.FC<{ stats: AttendanceStats | null }> = ({ stats }) => {
  const p = stats?.presentDays ?? 22;
  const l = stats?.lateDays ?? 2;
  const a = stats?.absentDays ?? 1;
  const pct = stats?.attendancePercentage ?? 96;

  return (
    <Card style={styles.statsCard}>
      <Text style={styles.statsTitle}>Monthly Summary</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{p}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{l}</Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{a}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#818CF8' }]}>{pct}%</Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#131B2E',
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cardHeaderDate: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  punchesRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  punchItem: {
    flex: 1,
    alignItems: 'center',
  },
  punchLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    fontWeight: '600',
  },
  punchTime: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  punchMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  punchDivider: {
    width: 1,
    backgroundColor: '#1E293B',
    marginHorizontal: 12,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnCheckIn: {
    backgroundColor: '#4F46E5',
  },
  actionBtnCheckOut: {
    backgroundColor: '#D97706',
  },
  actionBtnDone: {
    backgroundColor: '#1E293B',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  statsCard: {
    backgroundColor: '#131B2E',
    marginTop: 4,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  }
});

export * from './SyncStatusCard';
