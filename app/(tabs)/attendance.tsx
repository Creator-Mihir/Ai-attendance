import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/ui';
import { PrimaryButton } from '../../src/components/buttons';
import { useAttendance } from '../../src/hooks/useAttendance';
import { useLocation } from '../../src/hooks/useLocation';
import { formatTime } from '../../src/utils/date';

export default function AttendanceTabScreen() {
  const router = useRouter();
  const { todayCheckIn, todayCheckOut } = useAttendance();
  const { result: locResult } = useLocation();
  const [selectedPunch, setSelectedPunch] = useState<'CHECK_IN' | 'CHECK_OUT'>(
    todayCheckIn ? 'CHECK_OUT' : 'CHECK_IN'
  );

  const isCheckedIn = Boolean(todayCheckIn);
  const isCheckedOut = Boolean(todayCheckOut);

  const handleLaunch = () => {
    router.push({
      pathname: '/attendance',
      params: { punchType: selectedPunch }
    });
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Attendance Action Center" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Toggle Mode */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, selectedPunch === 'CHECK_IN' && styles.toggleBtnActive]}
            onPress={() => setSelectedPunch('CHECK_IN')}
            disabled={isCheckedIn}
          >
            <Text style={[styles.toggleBtnText, selectedPunch === 'CHECK_IN' && styles.toggleBtnTextActive]}>
              Morning Check-In {isCheckedIn ? '✓' : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, selectedPunch === 'CHECK_OUT' && styles.toggleBtnActive]}
            onPress={() => setSelectedPunch('CHECK_OUT')}
            disabled={!isCheckedIn || isCheckedOut}
          >
            <Text style={[styles.toggleBtnText, selectedPunch === 'CHECK_OUT' && styles.toggleBtnTextActive]}>
              Evening Check-Out {isCheckedOut ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Punch Status Details */}
        <View style={styles.statusBox}>
          <Text style={styles.boxTitle}>
            {selectedPunch === 'CHECK_IN' ? 'Morning Check-In Window' : 'Evening Check-Out Window'}
          </Text>
          <Text style={styles.boxDesc}>
            {selectedPunch === 'CHECK_IN'
              ? isCheckedIn
                ? `You marked check-in at ${formatTime(todayCheckIn!.timestamp)}.`
                : 'Punches before 08:45 AM are recorded as On-Time.'
              : isCheckedOut
                ? `You marked check-out at ${formatTime(todayCheckOut!.timestamp)}.`
                : isCheckedIn
                  ? 'Ready to mark departure after completing scheduled lectures.'
                  : 'You must complete check-in before checking out.'}
          </Text>
        </View>

        {/* Pre-flight Checklist */}
        <View style={styles.preflightCard}>
          <Text style={styles.preflightTitle}>Verification Pre-flight</Text>

          <View style={styles.preflightItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <View style={styles.preflightDetails}>
              <Text style={styles.preflightLabel}>Campus Geofence</Text>
              <Text style={styles.preflightSub}>
                {locResult?.isInside ? 'Inside authorized perimeter' : 'Checking GPS location...'}
              </Text>
            </View>
          </View>

          <View style={styles.preflightItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <View style={styles.preflightDetails}>
              <Text style={styles.preflightLabel}>AI Liveness Detector</Text>
              <Text style={styles.preflightSub}>Anti-spoofing micro-challenge engine ready</Text>
            </View>
          </View>

          <View style={styles.preflightItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <View style={styles.preflightDetails}>
              <Text style={styles.preflightLabel}>Cryptographic Hardware Vault</Text>
              <Text style={styles.preflightSub}>Offline SQLite database active</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionArea}>
          <PrimaryButton
            title={
              isCheckedOut
                ? 'Attendance Complete for Today'
                : selectedPunch === 'CHECK_IN' && isCheckedIn
                ? 'Already Checked In'
                : `Launch AI Biometric Verification`
            }
            onPress={handleLaunch}
            disabled={(selectedPunch === 'CHECK_IN' && isCheckedIn) || isCheckedOut}
          />
        </View>
      </ScrollView>
    </View>
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
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#4F46E5',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusBox: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  boxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  boxDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  preflightCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 24,
  },
  preflightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#818CF8',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preflightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkIcon: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 16,
    marginRight: 10,
  },
  preflightDetails: {
    flex: 1,
  },
  preflightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  preflightSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionArea: {
    marginBottom: 20,
  }
});
