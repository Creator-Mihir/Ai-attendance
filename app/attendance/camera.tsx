import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../src/components/ui';
import { PrimaryButton } from '../../src/components/buttons';
import { FaceScannerOverlay, LiveCameraView } from '../../src/components/camera';
import { CameraService } from '../../src/services/camera.service';
import { FaceRecognitionService } from '../../src/services/face-recognition.service';
import { FaceLockService } from '../../src/services/face-lock.service';
import { useAuthStore } from '../../src/store/auth.store';
import { useVerificationStore } from '../../src/store/verification.store';
import { AntiSpoofService } from '../../src/services/anti-spoof.service';
import type { DepthLivenessEvidence } from '../../src/types/verification';

export default function AttendanceCameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const punchType = (params.punchType as 'CHECK_IN' | 'CHECK_OUT') || 'CHECK_IN';

  const { teacher } = useAuthStore();
  const { setCapturedFrame, locationResult, setDepthLivenessEvidence } = useVerificationStore();

  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Position face inside the oval');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [depthEvidence, setDepthEvidence] = useState<DepthLivenessEvidence | null>(null);

  useEffect(() => {
    return () => {
      CameraService.stop();
    };
  }, []);

  const handleVerifyIdentityAndLock = async () => {
    if (!teacher) {
      router.replace('/(auth)/login');
      return;
    }

    const gpsPassed = Boolean(locationResult && locationResult.isInside && locationResult.accuracyAcceptable && !locationResult.isMockedLocation);
    if (!gpsPassed) {
      router.replace({ pathname: '/attendance/failed', params: { punchType, reason: 'LOCATION_RESULT_MISSING', message: 'Verify the campus GPS location before starting face and depth checks.' } });
      return;
    }

    setIsVerifying(true);
    setStatusMessage('Capturing high-resolution camera frame...');

    try {
      // 1. Capture real camera photo
      const capture = await CameraService.takePhoto({ facing: 'front' });
      setCapturedFrame(capture);

      setStatusMessage('Extracting biometric neural embeddings...');

      // 2. STAGE 1: Real Teacher Face Recognition
      const result = await FaceRecognitionService.verifyTeacherIdentity({
        teacher,
        capturedFrame: capture,
      });

      setMatchScore(result.matchScore);

      if (!result.success) {
        setIsVerifying(false);
        router.replace({
          pathname: '/attendance/failed',
          params: {
            punchType,
            reason: result.reason || 'FACE_MISMATCH',
            message:
              result.reason === 'ENROLLMENT_MISSING'
                ? 'Teacher biometric reference profile is not enrolled in SQLite database.'
                : result.reason === 'ENROLLMENT_MODEL_MISMATCH'
                ? 'The saved face template was created by another or unknown model. Re-enroll this face on this device.'
                : result.reason === 'FACE_MODEL_UNAVAILABLE'
                ? 'Real face recognition is not configured on this build. Attendance is blocked.'
                : result.reason === 'MULTIPLE_FACES'
                ? 'More than one face is visible. Keep only the teacher in the camera view.'
                : result.reason === 'NO_FACE_DETECTED'
                ? 'No face was detected. Center your face in the camera and try again.'
                : result.reason === 'FACE_MISMATCH'
                ? 'The live face did not match this teacher’s enrolled face template.'
                : result.reason || 'Face verification failed.',
          },
        });
        return;
      }

      // 3. STAGE 2: Lock verified face to active session
      setStatusMessage('Biometric identity verified! Locking session face track...');
      if (result.detectedEmbedding) {
        FaceLockService.lockSession({
          teacherId: teacher.id,
          baselineEmbedding: result.detectedEmbedding,
          boundingBox: result.faceBoundingBox,
        });
      }

      setStatusMessage('Checking ARCore depth support for the front camera...');
      const depthCheck = await AntiSpoofService.checkDepthAvailability();
      setDepthEvidence(depthCheck);
      setDepthLivenessEvidence(depthCheck);

      if (depthCheck.capability !== 'UNSUPPORTED') {
        // A supported API without actual depth frames is inconclusive, never a pass.
        // The final verification screen displays and rejects this incomplete check.
        setStatusMessage(depthCheck.capability === 'SUPPORTED'
          ? 'Depth capability found; checking requires real depth frames.'
          : 'Depth capability is not confirmed; other checks will run, but attendance cannot pass without a real depth result.');
      } else {
        setStatusMessage('Front-camera depth is unsupported; continuing with face and spoken liveness checks.');
      }

      setTimeout(() => {
        setIsVerifying(false);
        // Replace the identity camera route so its native CameraX session is
        // released before the liveness screen binds its preview/analysis use cases.
        router.replace({
          pathname: '/attendance/liveness',
          params: {
            punchType,
            faceMatchScore: String(result.matchScore),
          },
        });
      }, 500);
    } catch (err: any) {
      setIsVerifying(false);
      setStatusMessage('Error verifying identity: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Stage 1: Identity Match"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerInfo}>
          <Text style={styles.stepBadge}>STAGE 1 OF 3 • FACE MATCH</Text>
          <Text style={styles.stepTitle}>Verify Faculty Identity</Text>
          <Text style={styles.stepSubtitle}>
            Matching live front camera face against registered profile for {teacher?.fullName || 'Faculty'}.
          </Text>
          <Text style={styles.arcoreNotice}>
            Android may use Google Play Services for AR (ARCore) to check front-camera depth capability.
          </Text>
        </View>

        {/* Camera Viewfinder */}
        <View style={styles.cameraBox}>
          <LiveCameraView facing="front" onReadyChange={setCameraReady} />
          <FaceScannerOverlay
            statusText={statusMessage}
            isFaceAligned={null}
            isScanning={isVerifying}
          />
        </View>

        {matchScore !== null && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Biometric Cosine Similarity:</Text>
            <Text style={styles.scoreValue}>{(matchScore * 100).toFixed(1)}% (Threshold: 82.0%)</Text>
          </View>
        )}

        {depthEvidence && (
          <View style={styles.depthCard}>
            <Text style={styles.depthLabel}>Front-camera depth capability</Text>
            <Text style={styles.depthValue}>
              {depthEvidence.capability === 'UNSUPPORTED' ? 'Unsupported • permitted fallback' :
                depthEvidence.capability === 'SUPPORTED' ? 'Supported, but no depth frames analyzed' : 'Unavailable • not treated as a pass'}
            </Text>
            {depthEvidence.reason ? <Text style={styles.depthReason}>{depthEvidence.reason}</Text> : null}
          </View>
        )}

        <View style={styles.actions}>
          <PrimaryButton
            title={isVerifying ? 'Verifying Neural Embeddings...' : cameraReady ? 'Verify Identity & Lock Face' : 'Opening camera...'}
            onPress={handleVerifyIdentityAndLock}
            loading={isVerifying}
            disabled={!cameraReady || isVerifying}
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
    padding: 18,
    justifyContent: 'space-between',
  },
  headerInfo: {
    marginBottom: 14,
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
  arcoreNotice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 15,
  },
  cameraBox: {
    height: 360,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  cameraBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderFace: {
    fontSize: 110,
    opacity: 0.15,
  },
  scoreCard: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '700',
  },
  depthCard: {
    backgroundColor: '#131B2E', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#1E293B',
  },
  depthLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  depthValue: { fontSize: 13, color: '#E2E8F0', fontWeight: '700', marginTop: 4 },
  depthReason: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  actions: {
    marginBottom: 20,
  },
});
