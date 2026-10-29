import {
  VerificationResult,
  LivenessChallengeType,
  FaceRecognitionResult,
  SpokenChallenge,
  VerificationCheck,
  SpokenLivenessEvidence,
  DepthLivenessEvidence,
} from '../types/verification';
import { VerificationRepository } from '../database/repositories/verification.repository';
import { VerificationDomain } from '../domain/verification';
import { TeacherProfile } from '../types/teacher';
import { SyncQueue } from '../sync/sync-queue';
import { FaceRecognitionService } from './face-recognition.service';
import { FaceLockService } from './face-lock.service';
import { ChallengeService } from './challenge.service';
import { AudioVideoSyncService, AvSampleWindow } from './av-sync.service';
import { CameraCaptureResult, BiometricAuthResult } from '../types/hardware';
import { LocationVerificationResult } from '../types/location';
import { SpeechService } from './speech.service';
import { AppConfig } from '../constants/config';

const pipelineIssuedResults = new WeakSet<object>();

export interface MultiFactorVerificationParams {
  teacher: TeacherProfile;
  capturedFrame: CameraCaptureResult | string;
  challengeId: string;
  spokenAudioText: string;
  avWindows?: AvSampleWindow[];
  geofencePassed: boolean;
  deviceIntegrityPassed: boolean;
  attendanceId?: string;
  simulatedSpoof?: boolean;
  locationResult?: LocationVerificationResult;
  deviceIntegrityAllowedToProceed?: boolean;
  deviceIntegrityMessage?: string;
  spokenLivenessEvidence?: SpokenLivenessEvidence | null;
  depthLivenessEvidence?: DepthLivenessEvidence | null;
  biometricAuthResult?: BiometricAuthResult | null;
  /** Optional live embedding vector for testing or pre-extracted embeddings */
  liveVector?: number[];
}

export class VerificationService {
  /** Only a future fully evidence-backed pipeline may register an approvable result. */
  public static isApprovedPipelineResult(result: VerificationResult): boolean {
    return Boolean(result && result.passed === true && pipelineIssuedResults.has(result));
  }

  /**
   * Generates a fresh random spoken-sentence challenge bound to the teacher.
   */
  public static createSpokenChallenge(teacherId: string, sessionId?: string): SpokenChallenge {
    return ChallengeService.createChallenge({ teacherId, sessionId });
  }

  /**
   * Legacy challenge generator for backward compatibility.
   */
  public static generateChallenges(count = 2): { challenge: LivenessChallengeType; prompt: string }[] {
    const list: { challenge: LivenessChallengeType; prompt: string }[] = [];
    const used = new Set<string>();

    while (list.length < count) {
      const item = VerificationDomain.generateRandomChallenge();
      if (!used.has(item.challenge)) {
        used.add(item.challenge);
        list.push(item);
      }
    }
    return list;
  }

  /**
   * STAGE 1: Real Teacher Face Recognition.
   */
  public static async verifyIdentity(params: {
    teacher: TeacherProfile;
    frame: CameraCaptureResult | string;
    threshold?: number;
    liveVector?: number[];
    forceNoFace?: boolean;
    multipleFacesDetected?: boolean;
  }): Promise<FaceRecognitionResult> {
    return FaceRecognitionService.verifyTeacherIdentity({
      teacher: params.teacher,
      capturedFrame: params.frame,
      threshold: params.threshold,
      liveVector: params.liveVector,
      forceNoFace: params.forceNoFace,
      multipleFacesDetected: params.multipleFacesDetected,
    });
  }

  /**
   * STAGE 2: Lock the verification session to the verified face.
   */
  public static lockFaceSession(params: {
    teacherId: string;
    baselineEmbedding: number[];
  }) {
    return FaceLockService.lockSession(params);
  }

  /**
   * MASTER VERIFICATION ORCHESTRATOR
   * Executes the exact mandatory pipeline:
   * 1. Teacher Identity Match (real biometric embedding comparison)
   * 2. Session Face Lock
   * 3. Random Challenge Validation
   * 4. Speech-to-Text Recognition
   * 5. Face Tracking Continuity
   * 6. Audio-Video Synchronization
   * 7. Anti-Spoofing & Optional Depth Check
   * 8. Final Decision & SQLite Audit Persistence
   */
  public static async orchestrateMultiFactorVerification(
    params: MultiFactorVerificationParams
  ): Promise<VerificationResult> {
    const startedAt = Date.now();
    const {
      teacher, attendanceId, challengeId, spokenAudioText, capturedFrame,
      locationResult, deviceIntegrityPassed, deviceIntegrityAllowedToProceed,
      deviceIntegrityMessage, spokenLivenessEvidence,
      depthLivenessEvidence, biometricAuthResult,
    } = params;
    const checks: VerificationCheck[] = [
      { id: 'phone_biometric', label: 'Phone Biometric Authentication', status: 'NOT_RUN', detail: 'Phone biometric authentication has not run.' },
      { id: 'face_identity', label: 'Registered face match', status: 'NOT_RUN', detail: 'Face match has not run.' },
      { id: 'face_continuity', label: 'Same face during spoken check', status: 'NOT_RUN', detail: 'Face continuity has not been confirmed.' },
      { id: 'spoken_challenge', label: 'Random spoken phrase', status: 'NOT_RUN', detail: 'Spoken challenge has not been verified.' },
      { id: 'lip_sync', label: 'Voice and mouth movement', status: 'NOT_RUN', detail: 'Lip synchronization has not been verified.' },
      { id: 'location', label: 'Campus location and GPS accuracy', status: 'NOT_RUN', detail: 'Location has not been verified.' },
      { id: 'device_integrity', label: 'Device integrity', status: 'NOT_RUN', detail: 'Device integrity has not been verified.' },
      { id: 'depth_anti_spoof', label: 'Front-camera depth liveness', status: 'NOT_RUN', detail: 'ARCore depth capability has not been checked.' },
    ];
    const setCheck = (id: string, status: VerificationCheck['status'], detail: string) => {
      const check = checks.find((item) => item.id === id);
      if (check) { check.status = status; check.detail = detail; }
    };

    let faceMatch: FaceRecognitionResult | null = null;
    let speechResult: ReturnType<typeof SpeechService.evaluateSpeechMatch> | null = null;
    let avSyncResult = AudioVideoSyncService.analyzeTimedSync([], []);
    let challengeIsFresh = false;

    // Re-run the real on-device model against the captured image from stage 1.
    if (capturedFrame) {
      try {
        faceMatch = await FaceRecognitionService.verifyTeacherIdentity({ teacher, capturedFrame });
        setCheck('face_identity', faceMatch.success ? 'PASS' : 'FAIL', faceMatch.success
          ? `On-device face model matched the enrolled teacher (${(faceMatch.matchScore * 100).toFixed(1)}%).`
          : `Face model rejected the captured image: ${faceMatch.reason || 'face did not match'}.`);
      } catch (error) {
        setCheck('face_identity', 'FAIL', error instanceof Error ? error.message : 'Face recognition failed.');
      }
    } else {
      setCheck('face_identity', 'FAIL', 'The real stage 1 camera capture is missing.');
    }

    const faceLock = FaceLockService.getSession();
    const lockAgeMs = faceLock ? Date.now() - new Date(faceLock.lockedAt).getTime() : Number.POSITIVE_INFINITY;
    const lastFaceCheckAgeMs = faceLock ? Date.now() - new Date(faceLock.lastVerifiedAt).getTime() : Number.POSITIVE_INFINITY;
    const lockBelongsToTeacher = Boolean(faceLock && faceLock.isActive && faceLock.teacherId === teacher.id && lockAgeMs >= 0 && lockAgeMs <= 60000);
    const embeddingContinuity = Boolean(faceMatch?.success && faceMatch.detectedEmbedding && faceLock &&
      FaceLockService.verifyContinuity({ facePresent: true, liveEmbedding: faceMatch.detectedEmbedding }).continuous);
    const continuityPassed = Boolean(
      lockBelongsToTeacher && lastFaceCheckAgeMs >= 0 && lastFaceCheckAgeMs <= 60000 &&
      embeddingContinuity && spokenLivenessEvidence && spokenLivenessEvidence.faceContinuityPassed &&
      spokenLivenessEvidence.challengeId === challengeId
    );
    setCheck('face_continuity', continuityPassed ? 'PASS' : 'FAIL', continuityPassed
      ? 'The locked teacher face was matched again and remained tracked during the spoken attempt.'
      : 'The locked face session or live face tracking evidence is missing, stale, or belongs to another teacher.');

    const challenge = challengeId ? ChallengeService.getChallenge(challengeId) : null;
    const freshness = challengeId ? ChallengeService.validateFreshness(challengeId) : { valid: false as const, reason: 'NOT_FOUND' as const };
    challengeIsFresh = Boolean(freshness.valid && challenge && challenge.teacherId === teacher.id &&
      spokenLivenessEvidence && spokenLivenessEvidence.challengeId === challengeId &&
      spokenLivenessEvidence.recognizedTranscript.trim() === spokenAudioText.trim());
    if (challengeIsFresh && challenge) {
      speechResult = SpeechService.evaluateSpeechMatch({ expected: challenge.phrase, recognized: spokenAudioText });
      const speechPassed = speechResult.success && spokenLivenessEvidence?.recognizedTranscript.trim() === spokenAudioText.trim();
      setCheck('spoken_challenge', speechPassed ? 'PASS' : 'FAIL', speechPassed
        ? `The on-device recognizer matched the fresh phrase (${Math.round(speechResult.similarityScore * 100)}% phrase score).`
        : `The recognized words did not meet the phrase match requirement (${Math.round(speechResult.similarityScore * 100)}%).`);
    } else {
      const detail = !freshness.valid ? `The challenge is ${freshness.reason?.toLowerCase() || 'invalid'} or has already been used.`
        : 'Challenge evidence is missing, mismatched, or belongs to another teacher.';
      setCheck('spoken_challenge', 'FAIL', detail);
    }

    if (spokenLivenessEvidence?.challengeId === challengeId) {
      avSyncResult = AudioVideoSyncService.analyzeTimedSync(
        spokenLivenessEvidence.audioSamples,
        spokenLivenessEvidence.mouthSamples,
      );
    }
    const avPassed = avSyncResult.status === 'PASS' && avSyncResult.audioWindowCount >= 6;
    setCheck('lip_sync', avPassed ? 'PASS' : 'FAIL', avPassed
      ? `Real microphone and camera samples passed synchronization (correlation ${avSyncResult.correlation.toFixed(2)}, ${avSyncResult.audioWindowCount} matched pairs).`
      : `Lip synchronization did not pass (${avSyncResult.reason || 'insufficient evidence'}, ${avSyncResult.audioWindowCount} matched pairs, correlation ${avSyncResult.correlation.toFixed(2)}).`);

    const locationPassed = Boolean(locationResult && locationResult.isInside === true &&
      locationResult.accuracyAcceptable === true && locationResult.isMockedLocation === false &&
      Number.isFinite(locationResult.coordinates?.latitude) && Number.isFinite(locationResult.coordinates?.longitude) &&
      Number.isFinite(locationResult.coordinates?.accuracy));
    setCheck('location', locationPassed ? 'PASS' : 'FAIL', locationPassed
      ? `Current GPS fix is inside the campus boundary with ${locationResult!.coordinates.accuracy} m accuracy.`
      : !locationResult ? 'A current GPS location result is missing.'
      : locationResult.isMockedLocation ? 'The location provider marked this GPS fix as mocked.'
      : !locationResult.accuracyAcceptable ? 'GPS accuracy is too low for attendance.'
      : 'The current location is outside the campus boundary or invalid.');

    const integrityAllowed = deviceIntegrityAllowedToProceed === true;
    const integrityStatus: VerificationCheck['status'] = deviceIntegrityPassed
      ? 'PASS'
      : integrityAllowed ? 'BYPASSED' : 'FAIL';
    setCheck('device_integrity', integrityStatus, deviceIntegrityPassed
      ? 'The configured device integrity provider verified this device.'
      : deviceIntegrityMessage || (integrityAllowed
        ? 'Development-only bypass: attendance may continue, but device integrity is unverified.'
        : 'No configured device integrity provider approved this device.'));

    const depthFallbackAllowed = AppConfig.verification.depthPolicy === 'OPTIONAL' &&
      depthLivenessEvidence?.capability === 'UNSUPPORTED';
    const depthStatus: VerificationCheck['status'] = depthFallbackAllowed
      ? 'BYPASSED'
      : depthLivenessEvidence?.status === 'PASSED' && depthLivenessEvidence.frameCount && depthLivenessEvidence.frameCount > 0
      ? 'PASS'
      : depthLivenessEvidence?.status === 'FAILED' ? 'FAIL'
      : depthLivenessEvidence ? 'FAIL' : 'NOT_RUN';
    setCheck('depth_anti_spoof', depthStatus, depthFallbackAllowed
      ? `This front camera reports no ARCore Depth API support. The configured optional-depth policy allows the existing face and spoken-liveness checks to continue (${depthLivenessEvidence?.reason || 'unsupported'}).`
      : depthStatus === 'PASS'
      ? `Real front-camera depth frames passed liveness analysis (${depthLivenessEvidence?.frameCount} frames).`
      : depthLivenessEvidence?.capability === 'SUPPORTED'
      ? 'ARCore reports depth capability, but no real front-camera depth frames were analyzed. Attendance is rejected; capability alone is not liveness evidence.'
      : depthLivenessEvidence?.reason || 'No real depth liveness evidence was supplied.');

    // Phone native biometric verification check
    if (biometricAuthResult !== undefined && biometricAuthResult !== null) {
      if (biometricAuthResult.success) {
        setCheck(
          'phone_biometric',
          'PASS',
          `Phone biometric (${biometricAuthResult.biometryType || 'FINGERPRINT'}) verified successfully.`
        );
      } else {
        setCheck(
          'phone_biometric',
          'FAIL',
          biometricAuthResult.error || 'Phone biometric authentication failed or was cancelled.'
        );
      }
    } else {
      setCheck('phone_biometric', 'BYPASSED', 'Phone biometric verification not provided.');
    }

    // Consume the one-time phrase at the final decision point, after all checks read it.
    if (challengeIsFresh && challengeId) ChallengeService.consumeChallenge(challengeId);

    const requiredChecksPassed = checks.every((check) =>
      check.status === 'PASS' ||
      (check.id === 'phone_biometric' && check.status === 'BYPASSED') ||
      (check.id === 'device_integrity' && check.status === 'BYPASSED' && integrityAllowed) ||
      (check.id === 'depth_anti_spoof' && check.status === 'BYPASSED' && depthFallbackAllowed)
    );
    const firstFailedCheck = checks.find((check) => check.status === 'FAIL' || check.status === 'NOT_RUN' || check.status === 'NOT_CONFIGURED');
    const rejectionMap: Record<string, VerificationResult['rejectionReason']> = {
      phone_biometric: biometricAuthResult?.errorCode === 'USER_CANCEL'
        ? 'BIOMETRIC_CANCELLED'
        : biometricAuthResult?.errorCode === 'NOT_ENROLLED'
        ? 'BIOMETRIC_NOT_ENROLLED'
        : biometricAuthResult?.errorCode === 'NO_HARDWARE'
        ? 'BIOMETRIC_UNAVAILABLE'
        : 'BIOMETRIC_FAILED',
      face_identity: faceMatch?.reason === 'ENROLLMENT_MISSING' ? 'ENROLLMENT_MISSING' : 'FACE_MISMATCH',
      face_continuity: 'FACE_LOST',
      spoken_challenge: !freshness.valid ? 'CHALLENGE_EXPIRED' : 'SPEECH_MISMATCH',
      lip_sync: 'AV_SYNC_FAILED',
      location: locationResult?.isMockedLocation ? 'GPS_MOCKED' : 'OUTSIDE_GEOFENCE',
      device_integrity: 'DEVICE_SUSPICIOUS',
      depth_anti_spoof: 'SPOOF_DETECTED',
    };
    const result: VerificationResult = {
      id: 'ver_' + Math.random().toString(36).substring(2, 10),
      passed: requiredChecksPassed,
      rejectionReason: requiredChecksPassed ? undefined : rejectionMap[firstFailedCheck?.id || ''] || 'VERIFICATION_UNAVAILABLE',
      rejectionMessage: requiredChecksPassed ? undefined : firstFailedCheck?.detail || 'Required verification evidence is incomplete.',
      livenessPassed: Boolean(checks.find((check) => check.id === 'spoken_challenge')?.status === 'PASS' &&
        checks.find((check) => check.id === 'face_continuity')?.status === 'PASS' && avPassed),
      livenessScore: Number((((speechResult?.similarityScore || 0) + avSyncResult.syncScore) / 2).toFixed(4)),
      faceMatchPassed: faceMatch?.success === true,
      faceMatchScore: faceMatch?.matchScore || 0,
      geofencePassed: locationPassed,
      deviceIntegrityPassed: deviceIntegrityPassed === true,
      checks,
      timestamp: new Date().toISOString(),
      auditMeta: {
        sessionId: faceLock?.sessionId || '',
        teacherId: teacher.id,
        faceMatchModel: faceMatch?.modelVersion || 'unavailable',
        faceMatchScore: faceMatch?.matchScore || 0,
        faceMatchThreshold: faceMatch?.threshold || 0,
        faceLockTrackId: faceLock?.trackId || '',
        challengeId: challengeId || '',
        challengePhrase: challenge?.phrase || '',
        recognizedTranscript: spokenAudioText,
        speechConfidence: speechResult?.confidence || 0,
        wordMatchRate: speechResult?.wordMatchRate || 0,
        avSyncScore: avSyncResult.syncScore,
        avSyncStatus: avSyncResult.status,
        antiSpoofScore: depthLivenessEvidence?.score ?? 0,
        depthAvailable: depthLivenessEvidence?.status === 'READY' || depthLivenessEvidence?.status === 'PASSED',
        depthScore: depthLivenessEvidence?.score ?? null,
        clientTimestamp: new Date().toISOString(),
        executionDurationMs: Date.now() - startedAt,
        checks,
      },
    };
    FaceLockService.unlockSession();
    await VerificationRepository.save(result, attendanceId, 'initial', teacher.id);
    await SyncQueue.pushVerification(result, teacher.id, attendanceId);
    if (result.passed) pipelineIssuedResults.add(result);
    return result;
  }

  /**
   * Backward-compatible execution method supporting existing tests and components.
   */
  public static async executeVerification(params: {
    teacher: TeacherProfile;
    livenessScore: number;
    geofencePassed: boolean;
    deviceIntegrityPassed: boolean;
    attendanceId?: string;
    capturedFrame?: CameraCaptureResult | string;
    challengeId?: string;
    spokenAudioText?: string;
  }): Promise<VerificationResult> {
    const { teacher, attendanceId, geofencePassed } = params;
    // This legacy entry point cannot certify sensor evidence; never approve here.
    const result: VerificationResult = {
      id: 'ver_' + Math.random().toString(36).substring(2, 9),
      passed: false,
      rejectionReason: 'VERIFICATION_UNAVAILABLE',
      rejectionMessage: 'Legacy verification cannot approve attendance without real sensor evidence.',
      livenessPassed: false,
      livenessScore: 0,
      faceMatchPassed: false,
      faceMatchScore: 0,
      geofencePassed: geofencePassed === true,
      deviceIntegrityPassed: false,
      timestamp: new Date().toISOString(),
    };

    // Save to local SQLite database
    await VerificationRepository.save(result, attendanceId, 'initial', teacher.id);

    // Queue verification audit log for synchronization
    await SyncQueue.pushVerification(result, teacher.id, attendanceId);

    return result;
  }
}

export default VerificationService;
