import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { TodayAttendanceCard, StatsOverviewCard, SyncStatusCard } from '../../src/components/cards';
import { GeofenceRadar } from '../../src/components/location';
import { OfflineBanner } from '../../src/components/ui';
import { SyncQueueModal } from '../../src/components/attendance';
import { useAuthStore } from '../../src/store/auth.store';
import { useAttendance } from '../../src/hooks/useAttendance';
import { useLocation } from '../../src/hooks/useLocation';
import { useSync } from '../../src/hooks/useSync';
import { useNetwork } from '../../src/hooks/useNetwork';

export default function DashboardScreen() {
  const router = useRouter();
  const { teacher } = useAuthStore();
  const { todayCheckIn, todayCheckOut, stats, loadTodayStatus, loadStats } = useAttendance();
  const { result: locationResult, checkLocation, loading: locLoading } = useLocation();
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    lastSyncTimestamp,
    triggerSync,
    retryFailed,
  } = useSync();
  const { toggleNetwork } = useNetwork();
  const [queueModalVisible, setQueueModalVisible] = useState(false);

  const handleRefresh = async () => {
    if (teacher?.id) {
      await Promise.all([
        loadTodayStatus(teacher.id),
        loadStats(teacher.id),
        checkLocation(),
        isOnline ? triggerSync() : Promise.resolve(),
      ]);
    }
  };

  const handleStartAttendance = () => {
    const punchType = todayCheckIn ? 'CHECK_OUT' : 'CHECK_IN';
    router.push({
      pathname: '/attendance',
      params: { punchType }
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={locLoading} onRefresh={handleRefresh} tintColor="#6366F1" />
      }
    >
      {/* Header Profile Greeting */}
      <View style={styles.topProfileBar}>
        <View>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.teacherName}>{teacher?.fullName || 'Dr. Sarah Mitchell'}</Text>
          <Text style={styles.deptBadge}>{teacher?.department || 'Department of Computer Science'}</Text>
        </View>
        <View style={styles.avatarPill}>
          <Text style={styles.avatarInitials}>
            {(teacher?.fullName || 'SM').split(' ').map(p => p[0]).join('').slice(0, 2)}
          </Text>
        </View>
      </View>

      {/* Offline Banner (Shown only when offline) */}
      <OfflineBanner
        onTogglePress={toggleNetwork}
        onQueuePress={() => setQueueModalVisible(true)}
      />

      {/* Today's Punch Card */}
      <TodayAttendanceCard
        checkIn={todayCheckIn}
        checkOut={todayCheckOut}
        onPunchPress={handleStartAttendance}
        isInsideGeofence={locationResult?.isInside}
      />

      {/* Cloud Synchronization Status Card */}
      <SyncStatusCard
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        failedCount={failedCount}
        lastSyncTimestamp={lastSyncTimestamp}
        onSyncPress={triggerSync}
        onToggleNetworkPress={toggleNetwork}
        onViewQueuePress={() => setQueueModalVisible(true)}
        onRetryFailedPress={retryFailed}
      />

      {/* Campus Geofence Radar */}
      <GeofenceRadar locationResult={locationResult} />

      {/* Monthly Stats Card */}
      <StatsOverviewCard stats={stats} />

      {/* Sync Queue Inspector Modal */}
      <SyncQueueModal
        visible={queueModalVisible}
        onClose={() => setQueueModalVisible(false)}
        onSyncTriggered={() => {
          if (teacher?.id) {
            loadTodayStatus(teacher.id);
            loadStats(teacher.id);
          }
        }}
      />

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  container: {
    padding: 16,
  },
  topProfileBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 6,
  },
  greetingText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  teacherName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  deptBadge: {
    fontSize: 12,
    color: '#818CF8',
    marginTop: 3,
  },
  avatarPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  bottomSpacer: {
    height: 30,
  }
});
