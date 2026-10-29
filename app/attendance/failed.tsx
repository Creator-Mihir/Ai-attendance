import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { CameraService } from '../../src/services/camera.service';
import { VerificationCheckList, parseVerificationChecks } from '../../src/components/verification-check-list';
import { DepthLivenessCard } from '../../src/components/depth-liveness-card';

export default function AttendanceFailedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reason = (params.reason as string) || 'OUTSIDE_GEOFENCE';
  const message = (params.message as string) || 'Your attendance punch could not be validated.';
  const punchType = (params.punchType as string) || 'CHECK_IN';
  const checks = parseVerificationChecks(params.checks as string | string[] | undefined);

  useEffect(() => {
    CameraService.stop();
  }, []);

  const getReasonDetails = () => {
    switch (reason) {
      case 'OUTSIDE_GEOFENCE':
        return {
          title: 'Campus Perimeter Breach',
          advice: 'Move inside the authorized school campus grounds and ensure your GPS has clear sky visibility.',
        };
      case 'LIVENESS_FAILED':
        return {
          title: 'Liveness Motion Unconfirmed',
          advice: 'Please follow the challenge prompts precisely, blink or smile clearly, and ensure lighting is adequate.',
        };
      case 'FACE_MISMATCH':
        return {
          title: 'Biometric Mismatch',
          advice: 'The detected face does not match the enrolled faculty profile. If you have changed your appearance, update your face model in settings.',
        };
      case 'DEVICE_SUSPICIOUS':
        return {
          title: 'Device Security Compromise',
          advice: 'Mock GPS or root privileges detected. Please run on standard non-modified hardware.',
        };
      case 'BIOMETRIC_CANCELLED':
        return {
          title: 'Biometric Authentication Cancelled',
          advice: 'Biometric verification was cancelled. Tap Retry to authenticate with your phone fingerprint.',
        };
      case 'BIOMETRIC_FAILED':
        return {
          title: 'Biometric Verification Failed',
          advice: 'Fingerprint / biometric was not recognized. Please tap Retry to try again with an enrolled finger.',
        };
      case 'BIOMETRIC_NOT_ENROLLED':
        return {
          title: 'No Biometrics Enrolled',
          advice: 'No biometric credentials enrolled on this device. Please set up fingerprint or biometrics in your phone settings.',
        };
      case 'BIOMETRIC_UNAVAILABLE':
        return {
          title: 'Biometrics Unavailable',
          advice: 'Biometric hardware is not available or supported on this device.',
        };
      default:
        return {
          title: 'Validation Not Approved',
          advice: 'Please check your connection and retry.',
        };
    }
  };

  const details = getReasonDetails();

  const handleRetry = () => {
    router.replace({
      pathname: '/attendance',
      params: { punchType }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.failIconCircle}>
          <Text style={styles.failIcon}>✕</Text>
        </View>

        <Text style={styles.heading}>Attendance Rejected</Text>
        <Text style={styles.reasonBadge}>{details.title}</Text>

        <View style={styles.errorCard}>
          <Text style={styles.errorCardTitle}>Rejection Reason</Text>
          <Text style={styles.errorMsg}>{message}</Text>

          <View style={styles.adviceBox}>
            <Text style={styles.adviceTitle}>Suggested Resolution:</Text>
            <Text style={styles.adviceText}>{details.advice}</Text>
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
          title="Retry Verification"
          onPress={handleRetry}
          variant="primary"
        />

        <SecondaryButton
          title="Return to Dashboard"
          onPress={() => router.replace('/(tabs)')}
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
  failIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  failIcon: {
    color: '#EF4444',
    fontSize: 38,
    fontWeight: '800',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
  },
  reasonBadge: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  errorCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  errorMsg: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  adviceBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  adviceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 2,
  },
  adviceText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  actions: {
    marginTop: 24,
    marginBottom: 10,
  }
});
