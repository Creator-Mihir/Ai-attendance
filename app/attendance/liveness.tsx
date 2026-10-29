import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../src/components/ui';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { FaceScannerOverlay } from '../../src/components/camera';
import { FaceCamera, FaceCameraController, FaceFrame, useFaceCamera } from '@rbayuokt/expo-face-vision';
import { ChallengeService } from '../../src/services/challenge.service';
import { SpeechAvailability, SpeechService } from '../../src/services/speech.service';
import { AudioVideoSyncService } from '../../src/services/av-sync.service';
import { FaceLockService } from '../../src/services/face-lock.service';
import { FaceRecognitionService } from '../../src/services/face-recognition.service';
import { MouthMotionService } from '../../src/services/mouth-motion.service';
import { useAuthStore } from '../../src/store/auth.store';
import { useVerificationStore } from '../../src/store/verification.store';
import { SpokenChallenge } from '../../src/types/verification';

function LivenessCameraPreview(props: {
  onController: (camera: FaceCameraController) => void;
  onReady: (camera: FaceCameraController) => void;
  onFrame: (frame: FaceFrame) => void;
  onError: (message: string) => void;
}) {
  const camera = useFaceCamera({ tracking: true });
  useEffect(() => props.onController(camera), [camera, props.onController]);
  return (
    <FaceCamera
      camera={camera}
      facing="front"
      inferenceFps={12}
      detection={{ performanceMode: 'fast', contours: true, tracking: true, minFaceSize: 0.15 }}
      onCameraReady={() => props.onReady(camera)}
      onCameraError={(error) => props.onError(`${error.code}: ${error.message}`)}
      onFrame={props.onFrame}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function AttendanceLivenessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const punchType = (params.punchType as 'CHECK_IN' | 'CHECK_OUT') || 'CHECK_IN';
  const faceMatchScore = (params.faceMatchScore as string) || '';

  const { teacher } = useAuthStore();
  const { setSpokenTranscript, setSpokenLivenessEvidence } = useVerificationStore();

  const [challenge, setChallenge] = useState<SpokenChallenge | null>(null);
  const [challengeLoadError, setChallengeLoadError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [audioMeter, setAudioMeter] = useState(0);
  const [countdown, setCountdown] = useState(12);
  const [faceContinuityOk, setFaceContinuityOk] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [speechAvailability, setSpeechAvailability] = useState<SpeechAvailability>({ available: false, reason: 'CHECKING_OFFLINE_SPEECH_SUPPORT' });
  const [installingSpeechModel, setInstallingSpeechModel] = useState(false);

  const transcriptRef = useRef('');
  const faceContinuityRef = useRef(false);
  const faceContinuityFailedRef = useRef(false);
  const recordingActiveRef = useRef(false);
  const speechFailedRef = useRef(false);
  const recordingTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);
  const lastFaceCheckAtRef = useRef(0);
  const audioSamplesRef = useRef<Array<{ timestampMs: number; level: number }>>([]);
  const avSamplingErrorRef = useRef<string | null>(null);
  const cameraControllerRef = useRef<FaceCameraController | null>(null);
  const latestFrameRef = useRef<FaceFrame | null>(null);
  const trackedFaceIdRef = useRef<number | null>(null);
  const mouthSamplesRef = useRef<Array<{ timestampMs: number; aperture: number }>>([]);

  const handleCameraReady = useCallback((camera: FaceCameraController) => {
    cameraControllerRef.current = camera;
    setCameraReady(true);
    setFeedbackNotice((current) => current?.startsWith('CAMERA_UNAVAILABLE:') ? null : current);
  }, []);

  const handleCameraController = useCallback((camera: FaceCameraController) => {
    cameraControllerRef.current = camera;
  }, []);

  const handleCameraError = useCallback((message: string) => {
    setCameraReady(false);
    setFeedbackNotice(`CAMERA_UNAVAILABLE: The device could not start the camera stream. Retry once; if it continues, close other camera apps and restart attendance. Details: ${message}`);
  }, []);

  const handleRetryCamera = useCallback(() => {
    if (isRecording || analyzing) return;
    cameraControllerRef.current = null;
    latestFrameRef.current = null;
    trackedFaceIdRef.current = null;
    setCameraReady(false);
    setFeedbackNotice('Retrying camera…');
    setCameraAttempt((attempt) => attempt + 1);
  }, [isRecording, analyzing]);

  const handleLivenessFrame = useCallback((frame: FaceFrame) => {
    latestFrameRef.current = frame;
    if (!recordingActiveRef.current) return;
    const now = Date.now();
    if (frame.faces.length !== 1) {
      faceContinuityFailedRef.current = true;
      faceContinuityRef.current = false;
      setFaceContinuityOk(false);
      setFeedbackNotice(frame.faces.length === 0
        ? 'FACE_LOST: keep the enrolled face visible while speaking.'
        : 'MULTIPLE_FACES: only the enrolled teacher should be in view.');
      return;
    }

    const face = frame.faces[0];
    if (trackedFaceIdRef.current === null) {
      trackedFaceIdRef.current = face.trackingId ?? null;
    } else if (face.trackingId !== trackedFaceIdRef.current) {
      faceContinuityFailedRef.current = true;
      faceContinuityRef.current = false;
      setFaceContinuityOk(false);
      setFeedbackNotice('FACE_TRACK_CHANGED: the face in view changed during the spoken challenge.');
      return;
    }

    if (trackedFaceIdRef.current === null) {
      faceContinuityFailedRef.current = true;
      faceContinuityRef.current = false;
      setFaceContinuityOk(false);
      setFeedbackNotice('FACE_TRACKING_UNAVAILABLE: native camera did not provide a continuous face track.');
      return;
    }

    try {
      const aperture = MouthMotionService.measureApertureFromContours(face.contours);
      mouthSamplesRef.current.push({ timestampMs: now, aperture });
      if (mouthSamplesRef.current.length > 180) mouthSamplesRef.current.shift();
    } catch (error) {
      avSamplingErrorRef.current = error instanceof Error ? error.message : 'MOUTH_CONTOUR_UNAVAILABLE';
    }
    faceContinuityRef.current = !faceContinuityFailedRef.current;
    lastFaceCheckAtRef.current = now;
    setFaceContinuityOk(faceContinuityRef.current);
  }, []);

  useEffect(() => {
    if (!teacher) return;
    try {
      const fresh = ChallengeService.createChallenge({ teacherId: teacher.id });
      setChallenge(fresh);
      setChallengeLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SECURE_RANDOM_UNAVAILABLE';
      setChallengeLoadError(message);
      setFeedbackNotice(message);
    }

    faceContinuityRef.current = false;
    setFaceContinuityOk(false);
    void SpeechService.checkOnDeviceAvailability().then((availability) => {
      setSpeechAvailability(availability);
      if (!availability.available) setFeedbackNotice(availability.reason || 'ON_DEVICE_SPEECH_RECOGNITION_UNAVAILABLE');
    }).catch(() => {
      setSpeechAvailability({ available: false, reason: 'OFFLINE_SPEECH_SERVICE_UNAVAILABLE' });
      setFeedbackNotice('OFFLINE_SPEECH_SERVICE_UNAVAILABLE');
    });

    return () => {
      SpeechService.cancelListening();
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [teacher]);

  const handleRegenerateChallenge = () => {
    if (!challenge || isRecording || analyzing) return;
    const retry = ChallengeService.recordRetry(challenge.id);
    if (!retry.allowed || !retry.challenge) {
      setFeedbackNotice(retry.reason === 'MAX_RETRIES_EXCEEDED'
        ? 'CHALLENGE_RETRIES_EXHAUSTED: restart verification and recheck your identity.'
        : 'CHALLENGE_REGENERATION_FAILED: restart verification to get a fresh challenge.');
      return;
    }
    setChallenge(retry.challenge);
    setSpokenLivenessEvidence(null);
    setChallengeLoadError(null);
    setTranscript('');
    transcriptRef.current = '';
    setFeedbackNotice('Fresh secure challenge generated. Read the new phrase aloud.');
    speechFailedRef.current = false;
    audioSamplesRef.current = [];
    mouthSamplesRef.current = [];
    avSamplingErrorRef.current = null;
    setAudioMeter(0);
  };

  const handleStartRecording = async () => {
    if (!challenge) return;
    if (!cameraReady || !cameraControllerRef.current) {
      setFeedbackNotice('CAMERA_UNAVAILABLE: wait for the live camera to be ready, then retry.');
      return;
    }
    const availability = await SpeechService.checkOnDeviceAvailability();
    setSpeechAvailability(availability);
    if (!availability.available) {
      setFeedbackNotice(availability.reason || 'ON_DEVICE_SPEECH_RECOGNITION_UNAVAILABLE');
      return;
    }
    const freshness = ChallengeService.validateFreshness(challenge.id);
    if (!freshness.valid) {
      setFeedbackNotice(`CHALLENGE_${freshness.reason || 'INVALID'}: generate a fresh challenge before recording.`);
      return;
    }
    if (!FaceLockService.isLocked()) {
      setFeedbackNotice('FACE_LOCK_MISSING: repeat face identity verification before spoken liveness.');
      return;
    }
    const permissionGranted = await SpeechService.requestPermission();
    if (!permissionGranted) {
      setFeedbackNotice('MICROPHONE_OR_SPEECH_PERMISSION_DENIED: allow microphone and speech recognition in device settings.');
      return;
    }

    // Take one real image at the start of the attempt to bind the live camera
    // session to the previously locked teacher. Subsequent checks use native
    // face tracking and lip contours from preview frames, avoiding repeated
    // still-photo captures and shutter sounds while the teacher speaks.
    try {
      const initialImage = await cameraControllerRef.current.takePhoto({ quality: 0.55 });
      const identity = await FaceRecognitionService.extractEmbeddingFromFrame(initialImage.uri);
      if (!identity.detected || !identity.embedding) {
        setFeedbackNotice(identity.error || 'FACE_IDENTITY_UNAVAILABLE: could not verify the current camera face.');
        return;
      }
      const continuity = FaceLockService.verifyContinuity({
        facePresent: true,
        liveEmbedding: identity.embedding,
      });
      const initialFaces = latestFrameRef.current?.faces ?? [];
      if (!continuity.continuous || initialFaces.length !== 1 || initialFaces[0].trackingId == null) {
        setFeedbackNotice(continuity.reason || (initialFaces.length !== 1
          ? 'FACE_NOT_UNIQUE: show exactly one face in the camera.'
          : 'FACE_TRACKING_UNAVAILABLE: the camera did not provide a stable face track.'));
        setFaceContinuityOk(false);
        return;
      }
      trackedFaceIdRef.current = initialFaces[0].trackingId;
      faceContinuityRef.current = true;
      faceContinuityFailedRef.current = false;
      lastFaceCheckAtRef.current = Date.now();
      setFaceContinuityOk(true);
    } catch (error) {
      setFeedbackNotice(error instanceof Error ? error.message : 'FACE_IDENTITY_UNAVAILABLE');
      return;
    }

    setFeedbackNotice(null);
    setSpokenLivenessEvidence(null);
    setTranscript('');
    transcriptRef.current = '';
    mouthSamplesRef.current = [];
    setIsRecording(true);
    recordingActiveRef.current = true;
    setCountdown(12);
    faceContinuityRef.current = true;
    faceContinuityFailedRef.current = false;
    speechFailedRef.current = false;
    lastFaceCheckAtRef.current = Date.now();
    audioSamplesRef.current = [];
    avSamplingErrorRef.current = null;

    // 1. Begin real speech recognition & microphone sampling
    try {
      SpeechService.startListening({
        onResult: (text) => {
          transcriptRef.current = text;
          setTranscript(text);
        },
        onError: (err) => {
          speechFailedRef.current = true;
          setFeedbackNotice(err);
        },
        onEnd: () => {
          // Recognition cycle completed
        },
        onAudioLevel: (level) => {
          setAudioMeter(level);
          audioSamplesRef.current.push({ timestampMs: Date.now(), level });
          if (audioSamplesRef.current.length > 300) audioSamplesRef.current.shift();
        },
      });
    } catch (error) {
      recordingActiveRef.current = false;
      setIsRecording(false);
      setFeedbackNotice(error instanceof Error ? error.message : 'ON_DEVICE_SPEECH_START_FAILED');
      return;
    }

    // 2. Countdown timer for user feedback
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 3. Allow up to 12 seconds to collect real samples while keeping the same phrase.
    const autoFinishTimer = setTimeout(() => handleFinishRecordingAndEvaluate(), 12000);
    recordingTimerRef.current = autoFinishTimer;
  };

  const handleFinishRecordingAndEvaluate = async () => {
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (!recordingActiveRef.current) return;
    recordingActiveRef.current = false;

    setAnalyzing(true);
    await SpeechService.stopListening();
    setIsRecording(false);
    setAudioMeter(0);

    if (!challenge) return;
    const spokenText = transcriptRef.current.trim();

    setTranscript(spokenText);
    setSpokenTranscript(spokenText);

    setAnalyzing(false);

      // Check continuity
      if (!faceContinuityRef.current || faceContinuityFailedRef.current || Date.now() - lastFaceCheckAtRef.current > 2000) {
        setFeedbackNotice('FACE_LOST: the face was lost or changed during this attempt. Regenerate the phrase and try again with one face centered.');
        return;
      }

      if (speechFailedRef.current) {
        setFeedbackNotice(feedbackNotice || 'SPEECH_RECOGNITION_FAILED: speech recognition could not complete. Regenerate the phrase and retry.');
        return;
      }

      const freshness = ChallengeService.validateFreshness(challenge.id);
      if (!freshness.valid) {
        setFeedbackNotice(`CHALLENGE_${freshness.reason || 'INVALID'}: generate a fresh phrase and retry.`);
        return;
      }

      // Check 1: Real silence check — reject if user said nothing
      if (!spokenText) {
        const retryResult = ChallengeService.recordRetry(challenge.id);
        if (!retryResult.allowed) {
          setFeedbackNotice('NO_SPEECH_DETECTED: no words were recognized. Check microphone permission and retry after regenerating the phrase.');
        } else {
          setFeedbackNotice('⚠️ No speech detected. Please speak the phrase aloud clearly.');
          if (retryResult.challenge) {
            setChallenge(retryResult.challenge);
          }
        }
        return;
      }

      // Check 2: Evaluate speech match against challenge phrase
      const speechEval = SpeechService.evaluateSpeechMatch({
        expected: challenge.phrase,
        recognized: spokenText,
      });

      if (!speechEval.success) {
        const retryResult = ChallengeService.recordRetry(challenge.id);
        if (!retryResult.allowed) {
          setFeedbackNotice(`${speechEval.rejectionReason || 'SPEECH_MISMATCH'}: recognized words did not match. Retry limit reached; restart verification to continue.`);
        } else {
          setFeedbackNotice(`⚠️ Spoken text "${spokenText}" did not match phrase. Try reading again.`);
          if (retryResult.challenge) {
            setChallenge(retryResult.challenge);
          }
        }
        return;
      }

      // Check 3: Lip-Audio Synchronization
      const mouthSamples = mouthSamplesRef.current;
      const avSync = AudioVideoSyncService.analyzeTimedSync(audioSamplesRef.current, mouthSamples);
      if (avSync.status !== 'PASS') {
        const detail = avSamplingErrorRef.current || (audioSamplesRef.current.length === 0
          ? 'No real microphone level samples arrived from speech recognition.'
          : mouthSamples.length === 0
          ? 'No real mouth contour samples arrived from the camera.'
          : avSync.reason === 'STATIC_MOUTH_DETECTED'
          ? 'No measurable mouth movement matched the microphone audio.'
          : avSync.reason === 'CORRELATION_MARGINAL'
          ? `The app matched ${avSync.audioWindowCount} real audio and mouth samples, but their movement only partly lined up (correlation ${avSync.correlation.toFixed(2)}; it needs 0.50 or higher). Speak toward the phone in a quiet place and keep your mouth visible.`
          : `The app found ${avSync.audioWindowCount} real time-aligned sample pairs; it needs at least 6. Keep speaking until the phrase is complete and keep your face centered.`);
        setFeedbackNotice(`${avSync.reason || 'AV_SYNC_FAILED'}: ${detail} Regenerate the phrase and retry.`);
        return;
      }

      setSpokenLivenessEvidence({
        challengeId: challenge.id,
        recognizedTranscript: spokenText,
        faceContinuityPassed: faceContinuityRef.current && !faceContinuityFailedRef.current,
        audioSamples: audioSamplesRef.current.map((sample) => ({ ...sample })),
        mouthSamples: mouthSamplesRef.current.map((sample) => ({ ...sample })),
        capturedAt: new Date().toISOString(),
      });

      // All checks passed -> advance to verification synthesis
      router.push({
        pathname: '/attendance/verification',
        params: {
          punchType,
          challengeId: challenge.id,
          faceMatchScore,
          spokenTranscript: spokenText,
          speechScore: String(speechEval.similarityScore),
        },
      });
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Stage 2: Spoken Liveness"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerInfo}>
          <Text style={styles.stepBadge}>STAGE 2 OF 3 • SPOKEN CHALLENGE</Text>
          <Text style={styles.stepTitle}>Speak the Phrase Aloud</Text>
          <Text style={styles.stepSubtitle}>
            Read the phrase clearly into the microphone while keeping your face centered.
          </Text>
        </View>

        {/* Challenge Phrase Card */}
        <View style={styles.phraseCard}>
          <Text style={styles.phrasePrompt}>READ THIS PHRASE ALOUD:</Text>
          <Text style={styles.phraseText}>
            {challenge?.phrase ? `“${challenge.phrase}”` : challengeLoadError ? 'Secure challenge unavailable. Return and retry.' : 'Preparing secure challenge…'}
          </Text>

          <View style={styles.lockBadge}>
            <Text style={styles.lockDot}>🔒</Text>
            <Text style={styles.lockText}>Session locked to verified face</Text>
          </View>
        </View>

        {/* Live Camera Viewfinder with Audio Visualizer */}
        <View style={styles.viewfinder}>
          <LivenessCameraPreview
            key={cameraAttempt}
            onController={handleCameraController}
            onReady={handleCameraReady}
            onFrame={handleLivenessFrame}
            onError={handleCameraError}
          />
          <FaceScannerOverlay
            statusText={
              analyzing
                ? 'Analyzing visual speech synchronization...'
                : isRecording
                ? `Recording voice... (${countdown}s left) • Speak clearly`
                : 'Ready • Press Start Speaking'
            }
            isFaceAligned={faceContinuityOk}
            isScanning={isRecording || analyzing}
          />

          {/* Real-time Audio Level Bar */}
          {isRecording && (
            <View style={styles.audioLevelContainer}>
              <View style={[styles.audioLevelBar, { width: `${Math.round(audioMeter * 100)}%` }]} />
            </View>
          )}
        </View>

        {feedbackNotice?.startsWith('CAMERA_UNAVAILABLE:') ? (
          <View style={styles.actions}>
            <SecondaryButton title="Retry camera" onPress={handleRetryCamera} disabled={isRecording || analyzing} />
          </View>
        ) : null}

        <View style={styles.actions}>
          <SecondaryButton
            title={challenge ? `↻ Regenerate secure phrase (${challenge.retryCount}/${challenge.maxRetries})` : 'Regenerate secure phrase'}
            onPress={handleRegenerateChallenge}
            disabled={!challenge || isRecording || analyzing || challenge.retryCount >= challenge.maxRetries}
          />
        </View>

        {/* Feedback Notice */}
        {feedbackNotice ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{feedbackNotice}</Text>
          </View>
        ) : null}

        {!speechAvailability.available && speechAvailability.canInstallOfflineModel ? (
          <View style={styles.actions}>
            <PrimaryButton
              title={installingSpeechModel ? 'Opening offline model setup…' : 'Install offline English speech model'}
              loading={installingSpeechModel}
              disabled={installingSpeechModel || isRecording || analyzing}
              onPress={async () => {
                setInstallingSpeechModel(true);
                try {
                  const status = await SpeechService.installOfflineEnglishModel();
                  setFeedbackNotice(status === 'opened_dialog'
                    ? 'Follow the Android system prompt to install English speech recognition, then return here and retry.'
                    : 'Offline English speech model setup was requested. Wait for Android to finish, then retry.');
                  const next = await SpeechService.checkOnDeviceAvailability();
                  setSpeechAvailability(next);
                  if (next.available) setFeedbackNotice(null);
                } catch (error) {
                  setFeedbackNotice(error instanceof Error ? error.message : 'OFFLINE_MODEL_INSTALL_FAILED');
                } finally {
                  setInstallingSpeechModel(false);
                }
              }}
            />
          </View>
        ) : null}

        {/* Live Transcript Preview */}
        {transcript ? (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>Recognized Speech:</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        ) : null}

        {/* Action Button */}
        <View style={styles.actions}>
          {isRecording ? (
            <PrimaryButton
              title="✓ Done Speaking • Verify Now"
              onPress={handleFinishRecordingAndEvaluate}
              loading={analyzing}
              style={{ backgroundColor: '#10B981' }}
            />
          ) : (
            <PrimaryButton
              title={analyzing ? 'Verifying Audio-Visual Sync...' : '🎙️ Start Speaking Phrase'}
              onPress={handleStartRecording}
              loading={analyzing}
              disabled={analyzing || !speechAvailability.available}
            />
          )}
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
    marginBottom: 12,
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
    marginTop: 2,
    lineHeight: 18,
  },
  phraseCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    alignItems: 'center',
  },
  phrasePrompt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A5B4FC',
    letterSpacing: 1,
    marginBottom: 6,
  },
  phraseText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  lockDot: {
    fontSize: 11,
    marginRight: 4,
  },
  lockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C7D2FE',
  },
  viewfinder: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    backgroundColor: '#050811',
  },
  audioLevelContainer: {
    position: 'absolute',
    bottom: 46,
    left: 24,
    right: 24,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    zIndex: 15,
  },
  audioLevelBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  noticeCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  noticeText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  transcriptCard: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818CF8',
    marginBottom: 2,
  },
  transcriptText: {
    fontSize: 14,
    color: '#F8FAFC',
    fontStyle: 'italic',
  },
  actions: {
    marginTop: 8,
    marginBottom: 16,
  },
});

