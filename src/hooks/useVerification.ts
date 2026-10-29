import { useVerificationStore } from '../store/verification.store';

export function useVerification() {
  const store = useVerificationStore();

  return {
    step: store.step,
    challenges: store.challenges,
    currentChallengeIndex: store.currentChallengeIndex,
    currentChallenge: store.challenges[store.currentChallengeIndex] || null,
    livenessScore: store.livenessScore,
    faceMatchScore: store.faceMatchScore,
    geofencePassed: store.geofencePassed,
    deviceIntegrityPassed: store.deviceIntegrityPassed,
    isVerifying: store.isVerifying,
    lastResult: store.lastResult,
    error: store.error,

    currentSpokenChallenge: store.currentSpokenChallenge,
    activeCaptureFrame: store.activeCaptureFrame,
    spokenTranscript: store.spokenTranscript,
    identityMatchResult: store.identityMatchResult,
    speechResult: store.speechResult,
    avSyncResult: store.avSyncResult,
    antiSpoofResult: store.antiSpoofResult,

    startVerification: store.startVerification,
    startSpokenChallenge: store.startSpokenChallenge,
    setCapturedFrame: store.setCapturedFrame,
    setSpokenTranscript: store.setSpokenTranscript,
    verifyTeacherIdentity: store.verifyTeacherIdentity,
    executePhase5Pipeline: store.executePhase5Pipeline,
    setStep: store.setStep,
    recordChallengeScore: store.recordChallengeScore,
    setGeofenceResult: store.setGeofenceResult,
    setDeviceIntegrityResult: store.setDeviceIntegrityResult,
    completeVerification: store.completeVerification,
    reset: store.reset,
  };
}

export default useVerification;
