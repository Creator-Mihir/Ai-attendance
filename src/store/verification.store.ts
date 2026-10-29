import { create } from 'zustand';
import {
  VerificationResult,
  LivenessChallengeType,
  FaceRecognitionResult,
  SpokenChallenge,
  SpeechVerificationResult,
  AvSyncResult,
  AntiSpoofResult,
  SpokenLivenessEvidence,
  DepthLivenessEvidence,
} from '../types/verification';
import { TeacherProfile } from '../types/teacher';
import { VerificationService } from '../services/verification.service';
import { CameraCaptureResult } from '../types/hardware';
import { AvSampleWindow } from '../services/av-sync.service';
import { LocationVerificationResult } from '../types/location';

export type VerificationStep =
  | 'IDLE'
  | 'GEOFENCE_CHECK'
  | 'TEACHER_IDENTITY'
  | 'FACE_LOCK'
  | 'LIVENESS_CHALLENGE'
  | 'SPEECH_VERIFICATION'
  | 'AUDIO_VIDEO_VERIFICATION'
  | 'ANTI_SPOOF_CHECK'
  | 'FACE_RECOGNITION' // Backward compatibility
  | 'DEVICE_CHECK' // Backward compatibility
  | 'SAVING_LOCAL'
  | 'SUCCESS'
  | 'FAILED';

interface VerificationStoreState {
  step: VerificationStep;
  challenges: { challenge: LivenessChallengeType; prompt: string }[];
  currentChallengeIndex: number;
  livenessScore: number;
  faceMatchScore: number;
  geofencePassed: boolean;
  deviceIntegrityPassed: boolean;
  isVerifying: boolean;
  lastResult: VerificationResult | null;
  error: string | null;

  // Phase 5 State
  currentSpokenChallenge: SpokenChallenge | null;
  activeCaptureFrame: CameraCaptureResult | string | null;
  spokenTranscript: string;
  identityMatchResult: FaceRecognitionResult | null;
  speechResult: SpeechVerificationResult | null;
  avSyncResult: AvSyncResult | null;
  antiSpoofResult: AntiSpoofResult | null;
  spokenLivenessEvidence: SpokenLivenessEvidence | null;
  locationResult: LocationVerificationResult | null;
  depthLivenessEvidence: DepthLivenessEvidence | null;

  // Actions
  startVerification: (challenges?: { challenge: LivenessChallengeType; prompt: string }[]) => void;
  startSpokenChallenge: (teacherId: string) => SpokenChallenge;
  setStep: (step: VerificationStep) => void;
  setCapturedFrame: (frame: CameraCaptureResult | string) => void;
  setSpokenTranscript: (transcript: string) => void;
  setSpokenLivenessEvidence: (evidence: SpokenLivenessEvidence | null) => void;
  setLocationResult: (result: LocationVerificationResult | null) => void;
  setDepthLivenessEvidence: (result: DepthLivenessEvidence | null) => void;
  recordChallengeScore: (score: number) => void;
  setGeofenceResult: (passed: boolean) => void;
  setDeviceIntegrityResult: (passed: boolean) => void;

  verifyTeacherIdentity: (
    teacher: TeacherProfile,
    frame: CameraCaptureResult | string
  ) => Promise<FaceRecognitionResult>;

  completeVerification: (params: {
    teacher: TeacherProfile;
    geofencePassed: boolean;
    attendanceId?: string;
  }) => Promise<VerificationResult>;

  executePhase5Pipeline: (params: {
    teacher: TeacherProfile;
    geofencePassed: boolean;
    attendanceId?: string;
    avWindows?: AvSampleWindow[];
    simulatedSpoof?: boolean;
  }) => Promise<VerificationResult>;

  reset: () => void;
}

export const useVerificationStore = create<VerificationStoreState>((set, get) => ({
  step: 'IDLE',
  challenges: [],
  currentChallengeIndex: 0,
  livenessScore: 0,
  faceMatchScore: 0,
  geofencePassed: false,
  deviceIntegrityPassed: false,
  isVerifying: false,
  lastResult: null,
  error: null,

  currentSpokenChallenge: null,
  activeCaptureFrame: null,
  spokenTranscript: '',
  identityMatchResult: null,
  speechResult: null,
  avSyncResult: null,
  antiSpoofResult: null,
  spokenLivenessEvidence: null,
  locationResult: null,
  depthLivenessEvidence: null,

  startVerification: (customChallenges) => {
    const challenges = customChallenges || VerificationService.generateChallenges(2);
    set({
      step: 'GEOFENCE_CHECK',
      challenges,
      currentChallengeIndex: 0,
      isVerifying: true,
      lastResult: null,
      error: null,
    });
  },

  startSpokenChallenge: (teacherId) => {
    const challenge = VerificationService.createSpokenChallenge(teacherId);
    set({
      currentSpokenChallenge: challenge,
      step: 'LIVENESS_CHALLENGE',
      spokenTranscript: '',
      error: null,
    });
    return challenge;
  },

  setStep: (step) => set({ step }),

  setCapturedFrame: (frame) => set({ activeCaptureFrame: frame }),

  setSpokenTranscript: (transcript) => set({ spokenTranscript: transcript }),
  setSpokenLivenessEvidence: (evidence) => set({ spokenLivenessEvidence: evidence }),
  setLocationResult: (result) => set({ locationResult: result }),
  setDepthLivenessEvidence: (result) => set({ depthLivenessEvidence: result }),

  recordChallengeScore: (score) => {
    const { currentChallengeIndex, challenges, livenessScore } = get();
    const nextIndex = currentChallengeIndex + 1;
    const updatedScore = (livenessScore + score) / 2;

    if (nextIndex < challenges.length) {
      set({
        currentChallengeIndex: nextIndex,
        livenessScore: updatedScore,
        step: 'LIVENESS_CHALLENGE',
      });
    } else {
      set({
        currentChallengeIndex: nextIndex,
        livenessScore: updatedScore,
        step: 'FACE_RECOGNITION',
      });
    }
  },

  setGeofenceResult: (passed) => set({ geofencePassed: passed }),

  setDeviceIntegrityResult: (passed) => set({ deviceIntegrityPassed: passed }),

  verifyTeacherIdentity: async (teacher, frame) => {
    set({ step: 'TEACHER_IDENTITY', isVerifying: true, activeCaptureFrame: frame });
    try {
      const result = await VerificationService.verifyIdentity({
        teacher,
        frame,
      });

      if (result.success && result.detectedEmbedding) {
        VerificationService.lockFaceSession({
          teacherId: teacher.id,
          baselineEmbedding: result.detectedEmbedding,
        });
        set({
          identityMatchResult: result,
          faceMatchScore: result.matchScore,
          step: 'FACE_LOCK',
          isVerifying: false,
          error: null,
        });
      } else {
        set({
          identityMatchResult: result,
          faceMatchScore: result.matchScore,
          step: 'FAILED',
          isVerifying: false,
          error: result.reason || 'Teacher face mismatch',
        });
      }

      return result;
    } catch (err: any) {
      set({
        step: 'FAILED',
        isVerifying: false,
        error: err.message || 'Identity verification failed',
      });
      throw err;
    }
  },

  executePhase5Pipeline: async (params) => {
    const { teacher, geofencePassed, attendanceId, avWindows, simulatedSpoof } = params;
    const state = get();
    set({ step: 'SAVING_LOCAL', isVerifying: true });

    try {
      const frame = state.activeCaptureFrame;
      const challengeId = state.currentSpokenChallenge?.id;
      const spokenAudioText = state.spokenTranscript;

      if (!frame || !challengeId || !spokenAudioText) {
        const missingEvidence = await VerificationService.executeVerification({
          teacher,
          livenessScore: 0,
          geofencePassed,
          deviceIntegrityPassed: false,
          attendanceId,
        });
        set({ lastResult: missingEvidence, step: 'FAILED', isVerifying: false, error: missingEvidence.rejectionMessage });
        return missingEvidence;
      }

      const result = await VerificationService.orchestrateMultiFactorVerification({
        teacher,
        capturedFrame: frame,
        challengeId,
        spokenAudioText,
        avWindows,
        geofencePassed,
        deviceIntegrityPassed: state.deviceIntegrityPassed,
        attendanceId,
        simulatedSpoof,
      });

      set({
        lastResult: result,
        step: result.passed ? 'SUCCESS' : 'FAILED',
        isVerifying: false,
        faceMatchScore: result.faceMatchScore,
        livenessScore: result.livenessScore,
        error: result.passed ? null : result.rejectionMessage || 'Verification failed',
      });

      return result;
    } catch (err: any) {
      set({
        step: 'FAILED',
        isVerifying: false,
        error: err?.message || 'Phase 5 verification pipeline error',
      });
      throw err;
    }
  },

  completeVerification: async (params) => {
    const { teacher, geofencePassed, attendanceId } = params;
    set({ step: 'SAVING_LOCAL', isVerifying: true });

    try {
      const state = get();
      const result = await VerificationService.executeVerification({
        teacher,
        livenessScore: state.livenessScore,
        geofencePassed,
        deviceIntegrityPassed: state.deviceIntegrityPassed,
        attendanceId,
      });

      set({
        lastResult: result,
        step: result.passed ? 'SUCCESS' : 'FAILED',
        isVerifying: false,
        error: result.passed ? null : result.rejectionMessage || 'Verification rejected',
      });

      return result;
    } catch (err: any) {
      const errMsg = err?.message || 'Verification process failed';
      set({
        step: 'FAILED',
        isVerifying: false,
        error: errMsg,
      });
      throw err;
    }
  },

  reset: () =>
    set({
      step: 'IDLE',
      challenges: [],
      currentChallengeIndex: 0,
      livenessScore: 0,
      faceMatchScore: 0,
      geofencePassed: false,
      deviceIntegrityPassed: false,
      isVerifying: false,
      lastResult: null,
      error: null,
      currentSpokenChallenge: null,
      activeCaptureFrame: null,
      spokenTranscript: '',
      identityMatchResult: null,
      speechResult: null,
      avSyncResult: null,
      antiSpoofResult: null,
      spokenLivenessEvidence: null,
      locationResult: null,
      depthLivenessEvidence: null,
    }),
}));

export default useVerificationStore;
