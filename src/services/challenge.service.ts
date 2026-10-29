import { SpokenChallenge } from '../types/verification';
import * as Crypto from 'expo-crypto';

export const PHRASE_POOL_EN = [
  'Green trees grow near the school',
  'The morning bell rings at eight',
  'Teachers help students learn every day',
  'The library opens after assembly',
  'Science experiments inspire curiosity',
  'Mathematics builds logical thinking',
  'Clear sunlight warms the classroom',
  'Knowledge empowers young minds to succeed',
  'Daily attendance reflects discipline',
  'Education creates a bright future',
  'Students gather for the morning prayer',
  'Creative writing opens up new worlds',
  'Teamwork makes every project better',
  'Continuous learning expands your horizon',
  'Every lesson brings fresh understanding',
];

function secureRandomIndex(length: number): number {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('SECURE_RANDOM_UNAVAILABLE: secure challenge generation is unavailable on this device.');
  }
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / length) * length;
  const values = new Uint32Array(1);
  do {
    Crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % length;
}

export class ChallengeService {
  private static recentPhraseIndexes: number[] = [];
  private static readonly MAX_RECENT_HISTORY = 6;
  private static readonly CHALLENGE_LIFETIME_MS = 30000; // 30 seconds
  private static readonly MAX_RETRIES = 3;

  private static activeChallenges: Map<string, SpokenChallenge> = new Map();
  private static consumedChallengeIds: Set<string> = new Set();

  /**
   * Generates a fresh, unpredictable spoken sentence challenge.
   */
  public static createChallenge(params: {
    teacherId: string;
    sessionId?: string;
    language?: 'en-US' | 'hi-IN';
  }): SpokenChallenge {
    const { teacherId, language = 'en-US' } = params;
    const sessionId = params.sessionId || `ses_${this.secureToken()}`;

    // Filter available phrases to exclude recently used ones
    const availableIndexes: number[] = [];
    for (let i = 0; i < PHRASE_POOL_EN.length; i++) {
      if (!this.recentPhraseIndexes.includes(i)) {
        availableIndexes.push(i);
      }
    }

    // Fallback if all were used
    const poolToUse = availableIndexes.length > 0 ? availableIndexes : PHRASE_POOL_EN.map((_, i) => i);
    const chosenIndex = poolToUse[secureRandomIndex(poolToUse.length)];

    // Update anti-replay history
    this.recentPhraseIndexes.push(chosenIndex);
    if (this.recentPhraseIndexes.length > this.MAX_RECENT_HISTORY) {
      this.recentPhraseIndexes.shift();
    }

    const phrase = PHRASE_POOL_EN[chosenIndex];
    const now = Date.now();
    const challengeId = `ch_${this.secureToken()}`;

    const challenge: SpokenChallenge = {
      id: challengeId,
      sessionId,
      teacherId,
      phrase,
      language,
      difficulty: phrase.split(' ').length > 5 ? 'MEDIUM' : 'EASY',
      tokenCount: phrase.split(' ').length,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.CHALLENGE_LIFETIME_MS).toISOString(),
      retryCount: 0,
      maxRetries: this.MAX_RETRIES,
    };

    this.activeChallenges.set(challengeId, challenge);
    return challenge;
  }

  /**
   * Checks whether a challenge is currently valid and unexpired.
   */
  public static validateFreshness(challengeId: string): {
    valid: boolean;
    reason?: 'EXPIRED' | 'NOT_FOUND' | 'ALREADY_CONSUMED';
  } {
    if (this.consumedChallengeIds.has(challengeId)) {
      return { valid: false, reason: 'ALREADY_CONSUMED' };
    }

    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    const expiresAtMs = new Date(challenge.expiresAt).getTime();
    if (Date.now() > expiresAtMs) {
      return { valid: false, reason: 'EXPIRED' };
    }

    return { valid: true };
  }

  /**
   * Consumes a challenge so it cannot be replayed.
   */
  public static consumeChallenge(challengeId: string): boolean {
    const freshness = this.validateFreshness(challengeId);
    if (!freshness.valid) return false;

    this.consumedChallengeIds.add(challengeId);
    this.activeChallenges.delete(challengeId);
    return true;
  }

  /**
   * Increments retry count or produces a refreshed challenge if allowed.
   */
  public static recordRetry(challengeId: string): {
    allowed: boolean;
    challenge?: SpokenChallenge;
    reason?: string;
  } {
    const existing = this.activeChallenges.get(challengeId);
    if (!existing) {
      return { allowed: false, reason: 'CHALLENGE_NOT_FOUND' };
    }

    if (existing.retryCount >= existing.maxRetries) {
      return { allowed: false, reason: 'MAX_RETRIES_EXCEEDED' };
    }

    // Invalidate old
    this.activeChallenges.delete(challengeId);

    // Create fresh challenge bound to same session
    const fresh = this.createChallenge({
      teacherId: existing.teacherId,
      sessionId: existing.sessionId,
      language: existing.language,
    });
    fresh.retryCount = existing.retryCount + 1;

    return { allowed: true, challenge: fresh };
  }

  public static getChallenge(challengeId: string): SpokenChallenge | null {
    return this.activeChallenges.get(challengeId) || null;
  }

  private static secureToken(): string {
    const bytes = new Uint8Array(16);
    try {
      Crypto.getRandomValues(bytes);
    } catch (error) {
      throw new Error('SECURE_RANDOM_UNAVAILABLE: secure challenge generation is unavailable on this device.');
    }
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  public static resetHistory(): void {
    this.recentPhraseIndexes = [];
    this.activeChallenges.clear();
    this.consumedChallengeIds.clear();
  }
}

export default ChallengeService;
