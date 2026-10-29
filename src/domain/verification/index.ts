import { LivenessChallengeType } from '../../types/verification';
import { AppConfig } from '../../constants/config';

export class VerificationDomain {
  private static challenges: LivenessChallengeType[] = ['BLINK', 'SMILE', 'TURN_LEFT', 'TURN_RIGHT'];

  public static generateRandomChallenge(): { challenge: LivenessChallengeType; prompt: string } {
    const challenge = this.challenges[Math.floor(Math.random() * this.challenges.length)];
    const prompts: Record<LivenessChallengeType, string> = {
      BLINK: 'Blink your eyes twice slowly',
      SMILE: 'Give a gentle smile at the camera',
      TURN_LEFT: 'Slowly turn your head slightly to the left',
      TURN_RIGHT: 'Slowly turn your head slightly to the right',
      NOD: 'Nod your head gently up and down',
    };

    return {
      challenge,
      prompt: prompts[challenge],
    };
  }

  public static evaluateScore(liveness: number, match: number): boolean {
    return (
      liveness >= AppConfig.verification.minLivenessScore &&
      match >= AppConfig.verification.minFaceMatchScore
    );
  }
}
