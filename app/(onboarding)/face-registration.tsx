import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, ProgressBar } from '../../src/components/ui';
import { PrimaryButton } from '../../src/components/buttons';
import { FaceScannerOverlay, LiveCameraView } from '../../src/components/camera';
import { useTeacherStore } from '../../src/store/teacher.store';
import { useAuthStore } from '../../src/store/auth.store';

import { CameraService } from '../../src/services/camera.service';
import { FaceRecognitionService, FACE_MODEL_VERSION } from '../../src/services/face-recognition.service';
import { TeacherProfile } from '../../src/types/teacher';

type AngleType = 'FRONT' | 'LEFT' | 'RIGHT' | 'UP';

export default function FaceRegistrationScreen() {
  const router = useRouter();
  const { registerFace, isLoading } = useTeacherStore();
  const { teacher, updateTeacher } = useAuthStore();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedAngles, setCapturedAngles] = useState<AngleType[]>([]);
  const [capturedEmbeddings, setCapturedEmbeddings] = useState<number[][]>([]);
  const [isCapturingStep, setIsCapturingStep] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<{ uri: string; width: number; height: number; sizeBytes: number } | null>(null);
  const [captureDiagnostic, setCaptureDiagnostic] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => () => CameraService.stop(), []);

  const steps: { angle: AngleType; label: string; hint: string }[] = [
    { angle: 'FRONT', label: 'Face Front', hint: 'Look straight at the camera lens' },
    { angle: 'LEFT', label: 'Turn Left', hint: 'Turn your head slightly to the left' },
    { angle: 'RIGHT', label: 'Turn Right', hint: 'Turn your head slightly to the right' },
    { angle: 'UP', label: 'Tilt Up', hint: 'Tilt your chin slightly upwards' },
  ];

  const currentStep = steps[currentStepIndex];
  const progress = capturedAngles.length / steps.length;

  const handleCaptureAngle = async () => {
    if (isCapturingStep) return;
    setIsCapturingStep(true);
    setErrorMessage(null);
    setCaptureDiagnostic('Waiting for the camera to capture a local image...');
    try {
      const capture = await CameraService.takePhoto({ facing: 'front' });
      setLastCapture({ uri: capture.uri, width: capture.width, height: capture.height, sizeBytes: capture.sizeBytes });
      setCaptureDiagnostic(`Image captured and file verified: ${capture.width}×${capture.height} ${capture.format.toUpperCase()}, ${Math.round(capture.sizeBytes / 1024)} KB. Sending the local file to on-device ML Kit.`);
      const extraction = await FaceRecognitionService.extractEmbeddingFromFrame(capture);
      if (!extraction.detected || !extraction.embedding) {
        setCaptureDiagnostic(extraction.diagnostic || 'The local capture was made, but the native detector/model did not complete.');
        throw new Error(extraction.error || 'FACE_MODEL_UNAVAILABLE: face enrollment cannot proceed without a real face model.');
      }
      setCaptureDiagnostic(extraction.diagnostic || 'On-device face detection and embedding extraction succeeded.');
      setErrorMessage(null);

      const nextAngles = [...capturedAngles, currentStep.angle];
      const nextEmbeddings = [...capturedEmbeddings, extraction.embedding];
      setCapturedAngles(nextAngles);
      setCapturedEmbeddings(nextEmbeddings);
      setIsCapturingStep(false);

      if (nextAngles.length < steps.length) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        // Build one local template from the actual model output of each capture.
        if (!teacher) throw new Error('TEACHER_PROFILE_UNAVAILABLE: log in before enrolling a face.');
        const averaged = new Array(nextEmbeddings[0].length).fill(0);
        for (const vector of nextEmbeddings) {
          if (vector.length !== averaged.length) {
            throw new Error('FACE_MODEL_OUTPUT_INVALID: captures returned different embedding sizes.');
          }
          vector.forEach((value, index) => { averaged[index] += value; });
        }
        const norm = Math.sqrt(averaged.reduce((sum, value) => sum + value * value, 0));
        if (!Number.isFinite(norm) || norm === 0) {
          throw new Error('FACE_MODEL_OUTPUT_INVALID: captured embeddings could not be combined.');
        }
        const vector = averaged.map((value) => value / norm);

        const updatedTeacher: TeacherProfile = {
          ...teacher,
          faceRegistered: true,
          faceEmbedding: {
            version: FACE_MODEL_VERSION,
            vector,
            sampleCount: nextEmbeddings.length,
            enrolledAt: new Date().toISOString(),
          },
        };
        // Face vectors stay on device. Never upload them to the profile API.
        await updateTeacher(updatedTeacher);
        useTeacherStore.getState().setProfile(updatedTeacher);
        router.push('/(onboarding)/setup-complete');
      }
    } catch (err: any) {
      const msg = err?.message === 'NO_FACE_DETECTED'
        ? 'No face detected in the captured image. Check the preview below; improve lighting, center your face, or set the emulator front camera to Webcam0.'
        : err?.message || 'Face enrollment failed.';
      setErrorMessage(msg);
      setIsCapturingStep(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (teacher?.faceRegistered) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Facial Model Enrollment" onBack={handleBack} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerInfo}>
          <Text style={styles.stepCounter}>STEP {currentStepIndex + 1} OF 4</Text>
          <Text style={styles.angleTitle}>{currentStep.label}</Text>
          <Text style={styles.angleHint}>{currentStep.hint}. This sample is face-matched on device; head angle is not automatically measured by this model.</Text>
          <ProgressBar progress={progress} color="#10B981" />
        {errorMessage ? <Text style={[styles.angleHint, { color: '#EF4444', fontWeight: '600' }]}>{errorMessage}</Text> : null}
        </View>

        {/* Biometric Camera Viewfinder Box */}
        <View style={styles.viewfinderContainer}>
          <LiveCameraView facing="front" onReadyChange={setCameraReady} />
          <FaceScannerOverlay
            statusText={isCapturingStep ? 'Detecting one face and extracting its on-device embedding...' : currentStep.hint}
            isFaceAligned={null}
            isScanning={isCapturingStep}
          />
        </View>
        {!cameraReady ? (
          <View style={styles.cameraStatusRow}>
            <ActivityIndicator size="small" color="#818CF8" style={{ marginRight: 8 }} />
            <Text style={styles.diagnosticText}>
              Opening camera… If prompted, please allow camera permission.
            </Text>
          </View>
        ) : null}

        {lastCapture ? (
          <View style={styles.captureDiagnostics}>
            <Text style={styles.diagnosticTitle}>Last captured image (stored locally)</Text>
            <Image source={{ uri: lastCapture.uri }} style={styles.capturePreview} resizeMode="contain" />
            <Text style={styles.diagnosticText}>{lastCapture.width}×{lastCapture.height} · {Math.round(lastCapture.sizeBytes / 1024)} KB</Text>
            {captureDiagnostic ? <Text style={styles.diagnosticText}>{captureDiagnostic}</Text> : null}
          </View>
        ) : captureDiagnostic ? (
          <Text style={styles.diagnosticText}>{captureDiagnostic}</Text>
        ) : null}

        {/* Angle Chips Indicator */}
        <View style={styles.angleChips}>
          {steps.map((s, idx) => {
            const isDone = capturedAngles.includes(s.angle);
            const isCurrent = idx === currentStepIndex;
            return (
              <View
                key={s.angle}
                style={[
                  styles.chip,
                  isDone && styles.chipDone,
                  isCurrent && styles.chipCurrent,
                ]}
              >
                <Text style={[styles.chipText, isDone && styles.chipTextDone]}>
                  {isDone ? '✓ ' : ''}{s.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.actionArea}>
          <PrimaryButton
            title={isCapturingStep ? 'Processing Frame...' : `Capture ${currentStep.label}`}
            onPress={handleCaptureAngle}
            loading={isCapturingStep || isLoading}
            disabled={!cameraReady || isCapturingStep || isLoading}
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
  },
  headerInfo: {
    marginBottom: 16,
  },
  stepCounter: {
    fontSize: 11,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  angleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  angleHint: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  viewfinderContainer: {
    height: 340,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  captureDiagnostics: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  capturePreview: {
    width: '100%',
    height: 180,
    backgroundColor: '#020617',
    borderRadius: 8,
    marginVertical: 8,
  },
  diagnosticTitle: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  cameraStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  diagnosticText: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
  },
  simulatedCameraFeed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  cameraIcon: {
    fontSize: 100,
    opacity: 0.15,
  },
  angleChips: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  chip: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipCurrent: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1B4B',
  },
  chipDone: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  chipTextDone: {
    color: '#10B981',
    fontWeight: '700',
  },
  actionArea: {
    marginBottom: 20,
  }
});
