import { FaceLockSession, FaceBoundingBox } from '../types/verification';
import { FaceRecognitionService } from './face-recognition.service';

export class FaceLockService {
  private static activeSession: FaceLockSession | null = null;
  private static readonly CONTINUITY_SIMILARITY_THRESHOLD = 0.72;
  private static readonly SESSION_TIMEOUT_MS = 60000; // 60 seconds

  /**
   * Locks the current verification session to the successfully matched teacher face.
   */
  public static lockSession(params: {
    teacherId: string;
    baselineEmbedding: number[];
    boundingBox?: FaceBoundingBox;
    trackId?: string;
  }): FaceLockSession {
    const sessionId = 'flock_' + Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    const session: FaceLockSession = {
      sessionId,
      teacherId: params.teacherId,
      lockedAt: now,
      baselineEmbedding: params.baselineEmbedding,
      baselineBoundingBox: params.boundingBox,
      trackId: params.trackId,
      isActive: true,
      lastVerifiedAt: now,
    };

    this.activeSession = session;
    return session;
  }

  /**
   * Verifies that the face in the current frame is still the locked teacher face.
   */
  public static verifyContinuity(params: {
    liveEmbedding?: number[];
    facePresent: boolean;
    multipleFaces?: boolean;
    boundingBox?: FaceBoundingBox;
  }): {
    continuous: boolean;
    similarity: number;
    reason?: 'FACE_LOST' | 'FACE_SWAPPED' | 'MULTIPLE_FACES' | 'SESSION_EXPIRED' | 'NO_ACTIVE_LOCK';
  } {
    if (!this.activeSession || !this.activeSession.isActive) {
      return {
        continuous: false,
        similarity: 0,
        reason: 'NO_ACTIVE_LOCK',
      };
    }

    // Check expiration
    const elapsed = Date.now() - new Date(this.activeSession.lockedAt).getTime();
    if (elapsed > this.SESSION_TIMEOUT_MS) {
      this.activeSession.isActive = false;
      return {
        continuous: false,
        similarity: 0,
        reason: 'SESSION_EXPIRED',
      };
    }

    if (params.multipleFaces) {
      return {
        continuous: false,
        similarity: 0,
        reason: 'MULTIPLE_FACES',
      };
    }

    if (!params.facePresent || !params.liveEmbedding) {
      return {
        continuous: false,
        similarity: 0,
        reason: 'FACE_LOST',
      };
    }

    // Compare live frame embedding with locked baseline embedding
    const similarity = FaceRecognitionService.calculateCosineSimilarity(
      params.liveEmbedding,
      this.activeSession.baselineEmbedding
    );

    if (similarity < this.CONTINUITY_SIMILARITY_THRESHOLD) {
      return {
        continuous: false,
        similarity,
        reason: 'FACE_SWAPPED',
      };
    }

    this.activeSession.lastVerifiedAt = new Date().toISOString();
    return {
      continuous: true,
      similarity,
    };
  }

  public static getSession(): FaceLockSession | null {
    return this.activeSession;
  }

  public static isLocked(): boolean {
    return Boolean(this.activeSession && this.activeSession.isActive);
  }

  public static unlockSession(): void {
    if (this.activeSession) {
      this.activeSession.isActive = false;
    }
    this.activeSession = null;
  }

  public static reset(): void {
    this.unlockSession();
  }
}

export default FaceLockService;
