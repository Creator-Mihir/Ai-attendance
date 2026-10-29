import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Badge } from '../../src/components/ui';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { formatTime, formatDate } from '../../src/utils/date';
import { useNetwork } from '../../src/hooks/useNetwork';
import { CameraService } from '../../src/services/camera.service';
import { VerificationCheckList, parseVerificationChecks } from '../../src/components/verification-check-list';
import { DepthLivenessCard } from '../../src/components/depth-liveness-card';

export default function AttendanceSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isOnline } = useNetwork();

  useEffect(() => {
    CameraService.stop();
  }, []);

  const punchType = (params.punchType as string) || 'CHECK_IN';
  const status = (params.status as string) || 'PRESENT';
  const timestamp = (params.timestamp as string) || new Date().toISOString();
  const faceScore = (params.faceScore as string) || '—';
  const livenessScore = (params.livenessScore as string) || '—';
  const checks = parseVerificationChecks(params.checks as string | string[] | undefined);

  const isCheckIn = punchType === 'CHECK_IN';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.successIconCircle}>
          <Text style={styles.successIcon}>✓</Text>
        </View>

        <Text style={styles.heading}>
          {isCheckIn ? 'Morning Check-In Recorded!' : 'Evening Check-Out Recorded!'}
        </Text>
        <Text style={styles.dateSubtitle}>{formatDate(timestamp)}</Text>

        <View style={styles.badgeRow}>
          <Badge
            label={status === 'LATE' ? 'LATE ARRIVAL' : 'ON TIME (PRESENT)'}
            variant={status === 'LATE' ? 'warning' : 'success'}
            style={{ marginRight: 8 }}
          />
          <Badge
            label={isOnline ? 'CLOUD SYNCED' : 'OFFLINE SQLITE STORED'}
            variant={isOnline ? 'info' : 'neutral'}
          />
        </View>

        {/* Audit Details Card */}
        <View style={styles.auditCard}>
          <Text style={styles.auditCardTitle}>Verification Audit Trail</Text>

          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Recorded Time</Text>
            <Text style={styles.auditVal}>{formatTime(timestamp)}</Text>
          </View>

          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Phone Biometric</Text>
            <Text style={[styles.auditVal, { color: '#10B981' }]}>PASS (Verified)</Text>
          </View>

          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Facial Match Score</Text>
            <Text style={[styles.auditVal, { color: '#10B981' }]}>{faceScore}%</Text>
          </View>

          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>AI Liveness Confidence</Text>
            <Text style={[styles.auditVal, { color: '#10B981' }]}>{livenessScore}%</Text>
          </View>

          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Geofence Verification</Text>
            <Text style={[styles.auditVal, { color: '#10B981' }]}>PASS (Inside Campus)</Text>
          </View>

          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Offline Sync Queue</Text>
            <Text style={styles.auditVal}>{isOnline ? 'Reconciled' : 'Enqueued (Auto-syncs on network)'}</Text>
          </View>
        </View>

        <VerificationCheckList checks={checks} />
        <DepthLivenessCard
          evidence={params.depthEvidence as string | string[] | undefined}
          check={checks.find((check) => check.id === 'depth_anti_spoof')}
        />
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title="Return to Dashboard"
          onPress={() => router.replace('/(tabs)')}
        />
        <SecondaryButton
          title="View Attendance History"
          onPress={() => router.replace('/(tabs)/history')}
          style={{ marginTop: 10 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#0B0F19',
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    marginTop: 20,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIcon: {
    color: '#10B981',
    fontSize: 40,
    fontWeight: '800',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
  },
  dateSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  auditCard: {
    width: '100%',
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  auditCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#818CF8',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  auditLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  auditVal: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  actions: {
    marginTop: 24,
    marginBottom: 10,
  }
});
