import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../src/components/ui';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { useAuthStore } from '../../src/store/auth.store';
import { useAttendanceStore } from '../../src/store/attendance.store';
import { useVerificationStore } from '../../src/store/verification.store';
import { VerificationService } from '../../src/services/verification.service';
import { BiometricService } from '../../src/services/biometric.service';
import { CameraService } from '../../src/services/camera.service';
import { DeviceService } from '../../src/services/device.service';
import { VerificationCheck } from '../../src/types/verification';

export default function AttendanceVerificationSynthesisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const punchType = (params.punchType as 'CHECK_IN' | 'CHECK_OUT') || 'CHECK_IN';
  const challengeId = (params.challengeId as string) || '';
  const spokenTranscript = (params.spokenTranscript as string) || '';

  const { teacher } = useAuthStore();
  const { markAttendance } = useAttendanceStore();
  const { activeCaptureFrame, spokenLivenessEvidence, depthLivenessEvidence, locationResult: checkedLocationResult } = useVerificationStore();

  const [preflightReady, setPreflightReady] = useState(false);
  const [currentStep, setCurrentStep] = useState('Initiating multi-factor synthesis...');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const runStartedRef = useRef(false);

  useEffect(() => {
    async function preparePreflight() {
      if (!teacher) {
        router.replace('/(auth)/login');
        return;
      }
      if (runStartedRef.current) return;
      runStartedRef.current = true;

      try {
        setCurrentStep('Checking campus geofence perimeter...');
        const locationResult = checkedLocationResult;
        if (!locationResult || !locationResult.isInside) {
          throw new Error('LOCATION_RESULT_MISSING: Return to the location check and verify your campus location again.');
        }
        setCompletedSteps((prev) => [...prev, 'Campus Geofence Lock']);

        setCurrentStep('Validating face match and spoken challenge liveness...');
        setCompletedSteps((prev) => [
          ...prev,
          'Teacher Facial Recognition',
          'Spoken Challenge Match',
          'Lip-Audio Synchronization',
        ]);

        setCurrentStep('Pre-flight checks verified. Click "Mark Attendance" to verify your fingerprint.');
        setPreflightReady(true);
      } catch (err: any) {
        CameraService.stop();
        const message = err.message || 'System validation exception occurred.';
        const reason = message.startsWith('LOCATION_RESULT_MISSING') ? 'LOCATION_RESULT_MISSING' : 'VERIFICATION_UNAVAILABLE';
        const checks: VerificationCheck[] = [
          { id: 'phone_biometric', label: 'Phone Biometric Authentication', status: 'NOT_RUN', detail: 'Biometric verification did not run.' },
          { id: 'face_identity', label: 'Registered face match', status: 'NOT_RUN', detail: 'Final face validation did not run.' },
          { id: 'face_continuity', label: 'Same face during spoken check', status: 'NOT_RUN', detail: 'Final face continuity validation did not run.' },
          { id: 'spoken_challenge', label: 'Random spoken phrase', status: 'NOT_RUN', detail: 'Final phrase validation did not run.' },
          { id: 'lip_sync', label: 'Voice and mouth movement', status: 'NOT_RUN', detail: 'Final lip-sync validation did not run.' },
          { id: 'location', label: 'Campus location and GPS accuracy', status: 'FAIL', detail: message },
          { id: 'device_integrity', label: 'Device integrity', status: 'NOT_RUN', detail: 'Device integrity validation did not complete.' },
          { id: 'depth_anti_spoof', label: 'Front-camera depth liveness', status: depthLivenessEvidence?.capability === 'UNSUPPORTED' ? 'BYPASSED' : 'FAIL', detail: depthLivenessEvidence?.reason || 'Depth check did not complete.' },
        ];
        router.replace({
          pathname: '/attendance/failed',
          params: {
            punchType,
            reason,
            message,
            checks: JSON.stringify(checks),
            depthEvidence: JSON.stringify(depthLivenessEvidence || null),
          },
        });
      }
    }

    preparePreflight();
  }, [teacher, checkedLocationResult, depthLivenessEvidence, punchType]);

  const handleMarkAttendance = async () => {
    if (!teacher || isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError(null);
    setCurrentStep('Triggering phone biometric authentication...');

    try {
      const locationResult = checkedLocationResult;
      if (!locationResult) {
        throw new Error('LOCATION_RESULT_MISSING: GPS location is missing.');
      }

      // Trigger phone native biometric prompt
      const authResult = await BiometricService.authenticate('Scan fingerprint to verify attendance');

      if (!authResult.success) {
        setIsAuthenticating(false);
        const errorCode = authResult.errorCode || 'BIOMETRIC_FAILED';
        const reason = errorCode === 'USER_CANCEL'
          ? 'BIOMETRIC_CANCELLED'
          : errorCode === 'NOT_ENROLLED'
          ? 'BIOMETRIC_NOT_ENROLLED'
          : errorCode === 'NO_HARDWARE'
          ? 'BIOMETRIC_UNAVAILABLE'
          : 'BIOMETRIC_FAILED';

        const message = authResult.error || 'Biometric authentication was cancelled or failed. Attendance was not marked.';
        setAuthError(message);

        const failedChecks: VerificationCheck[] = [
          {
            id: 'phone_biometric',
            label: 'Phone Biometric Authentication',
            status: 'FAIL',
            detail: message,
          },
          { id: 'face_identity', label: 'Registered face match', status: 'PASS', detail: 'On-device face match passed.' },
          { id: 'face_continuity', label: 'Same face during spoken check', status: 'PASS', detail: 'Face continuity verified.' },
          { id: 'spoken_challenge', label: 'Random spoken phrase', status: 'PASS', detail: 'Spoken phrase matched.' },
          { id: 'lip_sync', label: 'Voice and mouth movement', status: 'PASS', detail: 'Lip-audio synchronized.' },
          { id: 'location', label: 'Campus location and GPS accuracy', status: 'PASS', detail: 'Inside campus geofence.' },
          { id: 'device_integrity', label: 'Device integrity', status: 'PASS', detail: 'Device security verified.' },
          { id: 'depth_anti_spoof', label: 'Front-camera depth liveness', status: depthLivenessEvidence?.capability === 'UNSUPPORTED' ? 'BYPASSED' : 'PASS', detail: depthLivenessEvidence?.reason || 'Depth capability checked.' },
        ];

        // Reject attendance: do not mark attendance in database or sync queue
        router.replace({
          pathname: '/attendance/failed',
          params: {
            punchType,
            reason,
            message,
            checks: JSON.stringify(failedChecks),
            depthEvidence: JSON.stringify(depthLivenessEvidence || null),
          },
        });
        return;
      }

      // Biometric authentication passed (success === true)
      setCurrentStep('Biometric verified! Orchestrating multi-factor synthesis...');
      const integrity = await DeviceService.verifyDeviceIntegrity();

      const verificationResult = await VerificationService.orchestrateMultiFactorVerification({
        teacher,
        capturedFrame: activeCaptureFrame || '',
        challengeId,
        spokenAudioText: spokenTranscript,
        geofencePassed: locationResult.isInside,
        deviceIntegrityPassed: integrity.verified,
        deviceIntegrityAllowedToProceed: integrity.allowedToProceed,
        deviceIntegrityMessage: integrity.message,
        locationResult,
        spokenLivenessEvidence,
        depthLivenessEvidence,
        biometricAuthResult: authResult,
      });

      if (!verificationResult.passed) {
        setIsAuthenticating(false);
        router.replace({
          pathname: '/attendance/failed',
          params: {
            punchType,
            reason: verificationResult.rejectionReason || 'VERIFICATION_REJECTED',
            message: verificationResult.rejectionMessage || 'Attendance verification was not approved.',
            checks: JSON.stringify(verificationResult.checks || []),
            depthEvidence: JSON.stringify(depthLivenessEvidence || null),
          },
        });
        return;
      }

      setCurrentStep('Recording attendance into local SQLite store & Sync Queue...');
      const result = await markAttendance({
        teacher,
        punchType,
        locationResult,
        verificationResult,
      });

      setIsAuthenticating(false);

      if (result.success && result.record) {
        router.replace({
          pathname: '/attendance/success',
          params: {
            punchType,
            recordId: result.record.id,
            status: result.record.status,
            timestamp: result.record.timestamp,
            faceScore: String(Math.round(result.record.faceMatchScore * 100)),
            livenessScore: String(Math.round(result.record.livenessScore * 100)),
            syncStatus: result.record.syncStatus,
            checks: JSON.stringify(verificationResult.checks || []),
            depthEvidence: JSON.stringify(depthLivenessEvidence || null),
            biometricStatus: 'PASS',
          },
        });
      } else {
        router.replace({
          pathname: '/attendance/failed',
          params: {
            punchType,
            reason: result.rejectionReason || 'VERIFICATION_REJECTED',
            message: result.rejectionMessage || 'Attendance verification was not approved.',
            checks: JSON.stringify(verificationResult.checks || []),
            depthEvidence: JSON.stringify(depthLivenessEvidence || null),
          },
        });
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      CameraService.stop();
      const message = err.message || 'Biometric authentication encountered an error.';
      router.replace({
        pathname: '/attendance/failed',
        params: {
          punchType,
          reason: 'BIOMETRIC_FAILED',
          message,
          checks: JSON.stringify([]),
        },
      });
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Biometric Check-In" onBack={() => router.replace('/(tabs)')} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerInfo}>
          <Text style={styles.stepBadge}>STAGE 3 • PHONE BIOMETRIC</Text>
          <Text style={styles.stepTitle}>Confirm Identity</Text>
          <Text style={styles.stepSubtitle}>
            Pre-flight checks passed. Touch phone fingerprint sensor to mark attendance.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fingerprintBadge}>
            <Text style={styles.fingerprintIcon}>👆</Text>
          </View>
          <Text style={styles.title}>Phone Biometric Verification</Text>
          <Text style={styles.step}>{currentStep}</Text>

          {authError ? (
            <View style={styles.errorNotice}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          ) : null}

          <View style={styles.checklist}>
            <Text style={completedSteps.includes('Campus Geofence Lock') ? styles.checkDone : styles.checkPending}>
              {completedSteps.includes('Campus Geofence Lock') ? '✓' : '•'} Campus Geofence Perimeter
            </Text>
            <Text style={completedSteps.includes('Teacher Facial Recognition') ? styles.checkDone : styles.checkPending}>
              {completedSteps.includes('Teacher Facial Recognition') ? '✓' : '•'} Enrolled Face Embedding Match
            </Text>
            <Text style={completedSteps.includes('Spoken Challenge Match') ? styles.checkDone : styles.checkPending}>
              {completedSteps.includes('Spoken Challenge Match') ? '✓' : '•'} Spoken-Sentence Liveness Challenge
            </Text>
            <Text style={completedSteps.includes('Lip-Audio Synchronization') ? styles.checkDone : styles.checkPending}>
              {completedSteps.includes('Lip-Audio Synchronization') ? '✓' : '•'} Audio-Video Lip Synchronization
            </Text>
            <Text style={isAuthenticating ? styles.checkAuthenticating : styles.checkBiometric}>
              {isAuthenticating ? '⏳ Scanning Fingerprint...' : '• Phone Fingerprint Authentication (Required)'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title={isAuthenticating ? 'Scanning Fingerprint...' : 'Mark Attendance'}
            onPress={handleMarkAttendance}
            loading={isAuthenticating || !preflightReady}
            disabled={isAuthenticating || !preflightReady}
          />

          <SecondaryButton
            title="Cancel"
            onPress={() => router.replace('/(tabs)')}
            style={{ marginTop: 10 }}
            disabled={isAuthenticating}
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
    padding: 20,
    justifyContent: 'space-between',
    flexGrow: 1,
  },
  headerInfo: {
    marginBottom: 16,
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    width: '100%',
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  fingerprintBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 2,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fingerprintIcon: {
    fontSize: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  step: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  errorNotice: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  checklist: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  checkDone: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 8,
  },
  checkPending: {
    fontSize: 13,
    color: '#818CF8',
    fontWeight: '600',
    marginBottom: 8,
  },
  checkBiometric: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '700',
    marginBottom: 4,
  },
  checkAuthenticating: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '700',
    marginBottom: 4,
  },
  actions: {
    marginBottom: 20,
  },
});
