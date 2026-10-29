import { LIVENESS_CHALLENGE, REJECTION_REASONS } from '../constants/attendance';

export type LivenessChallengeType = keyof typeof LIVENESS_CHALLENGE;
export type RejectionReason = keyof typeof REJECTION_REASONS;

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rollAngle?: number;
  yawAngle?: number;
}

export interface LivenessStep {
  challenge: LivenessChallengeType;
  instruction: string;
  completed: boolean;
  score: number;
  timestamp: number;
}

export interface VerificationRequest {
  teacherId: string;
  capturedImageBase64?: string;
  latitude: number;
  longitude: number;
  deviceFingerprint: string;
  clockTimestamp: string;
}

export interface VerificationResult {
  id: string;
  passed: boolean;
  rejectionReason?: RejectionReason;
  rejectionMessage?: string;
  livenessPassed: boolean;
  livenessScore: number;
  faceMatchPassed: boolean;
  faceMatchScore: number;
  geofencePassed: boolean;
  deviceIntegrityPassed: boolean;
  checks?: VerificationCheck[];
  timestamp: string;
  auditMeta?: MultiFactorAuditMeta;
}

export type VerificationCheckStatus = 'PASS' | 'FAIL' | 'BYPASSED' | 'NOT_RUN' | 'NOT_CONFIGURED';

export interface VerificationCheck {
  id: string;
  label: string;
  status: VerificationCheckStatus;
  detail: string;
}

export interface TimedAudioLevelSample {
  timestampMs: number;
  level: number;
}

export interface TimedMouthMotionSample {
  timestampMs: number;
  aperture: number;
}

export interface SpokenLivenessEvidence {
  challengeId: string;
  recognizedTranscript: string;
  faceContinuityPassed: boolean;
  audioSamples: TimedAudioLevelSample[];
  mouthSamples: TimedMouthMotionSample[];
  capturedAt: string;
}

export interface FaceRecognitionResult {
  success: boolean;
  teacherId: string;
  matchScore: number;
  threshold: number;
  modelVersion: string;
  timestamp: string;
  reason?: string;
  faceBoundingBox?: FaceBoundingBox;
  detectedEmbedding?: number[];
}

export interface FaceLockSession {
  sessionId: string;
  teacherId: string;
  lockedAt: string;
  baselineEmbedding: number[];
  baselineBoundingBox?: FaceBoundingBox;
  trackId?: string;
  isActive: boolean;
  lastVerifiedAt: string;
}

export interface SpokenChallenge {
  id: string;
  sessionId: string;
  teacherId: string;
  phrase: string;
  language: 'en-US' | 'hi-IN';
  difficulty: 'EASY' | 'MEDIUM';
  tokenCount: number;
  createdAt: string;
  expiresAt: string;
  retryCount: number;
  maxRetries: number;
}

export interface SpeechVerificationResult {
  success: boolean;
  expectedText: string;
  recognizedText: string;
  normalizedExpected: string;
  normalizedRecognized: string;
  similarityScore: number;
  confidence: number;
  wordMatchRate: number;
  durationMs: number;
  timestamp: string;
  rejectionReason?: string;
}

export interface AvSyncResult {
  status: 'PASS' | 'FAIL' | 'UNCERTAIN';
  syncScore: number;
  visualFrameCount: number;
  audioWindowCount: number;
  mouthMovementVariance: number;
  audioEnergyVariance: number;
  correlation: number;
  reason?: string;
}

export interface AntiSpoofResult {
  passed: boolean;
  textureScore: number;
  frequencyScore: number;
  depthSupported: boolean;
  depthAvailable: boolean;
  depthScore?: number | null;
  is2DFlatSurface: boolean;
  rejectionReason?: string;
}

export type DepthCapability = 'SUPPORTED' | 'UNSUPPORTED' | 'UNAVAILABLE';
export type DepthLivenessStatus = 'NOT_CHECKED' | 'CHECKING' | 'READY' | 'PASSED' | 'FAILED' | 'UNSUPPORTED' | 'UNAVAILABLE' | 'ERROR' | 'BYPASSED';

/** Capability and liveness evidence are separate: a capability check is never a liveness pass. */
export interface DepthLivenessEvidence {
  capability: DepthCapability;
  status: DepthLivenessStatus;
  cameraFacing: 'front';
  provider: 'ARCORE_DEPTH_API' | 'NONE';
  reason?: string;
  checkedAt: string;
  score?: number | null;
  frameCount?: number;
}

export interface MultiFactorAuditMeta {
  sessionId: string;
  teacherId: string;
  faceMatchModel: string;
  faceMatchScore: number;
  faceMatchThreshold: number;
  faceLockTrackId: string;
  challengeId: string;
  challengePhrase: string;
  recognizedTranscript: string;
  speechConfidence: number;
  wordMatchRate: number;
  avSyncScore: number;
  avSyncStatus: 'PASS' | 'FAIL' | 'UNCERTAIN';
  antiSpoofScore: number;
  depthAvailable: boolean;
  depthScore?: number | null;
  clientTimestamp: string;
  executionDurationMs: number;
  checks?: VerificationCheck[];
}

