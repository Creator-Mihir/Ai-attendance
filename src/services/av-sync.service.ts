import { AvSyncResult } from '../types/verification';

export interface AvSampleWindow {
  timestampMs: number;
  mouthAperture: number; // 0.0 (closed) to 1.0 (wide open)
  audioEnergy: number; // normalized native recognizer input level, 0.0 to 1.0
}

export interface TimedLevelSample {
  timestampMs: number;
  level: number;
}

export interface TimedMouthSample {
  timestampMs: number;
  aperture: number;
}

export class AudioVideoSyncService {
  private static readonly MIN_REQUIRED_WINDOWS = 6;
  private static readonly PASS_CORRELATION_THRESHOLD = 0.50; // Pearson r >= 0.50
  private static readonly UNCERTAIN_LOWER_BOUND = 0.30;

  /**
   * Calculates Pearson correlation coefficient between two numeric series.
   */
  public static calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    if (denominator === 0) return 0;

    return Math.max(-1, Math.min(1, numerator / denominator));
  }

  /**
   * Calculates statistical variance of a numeric array.
   */
  public static calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sqDiffs = values.map((v) => Math.pow(v - mean, 2));
    return sqDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Analyzes synchronized audio-video time windows to verify lip movement matches voice energy.
   */
  public static analyzeSync(windows: AvSampleWindow[]): AvSyncResult {
    if (!windows || windows.length < this.MIN_REQUIRED_WINDOWS) {
      return {
        status: 'FAIL',
        syncScore: 0,
        visualFrameCount: windows ? windows.length : 0,
        audioWindowCount: windows ? windows.length : 0,
        mouthMovementVariance: 0,
        audioEnergyVariance: 0,
        correlation: 0,
        reason: 'INSUFFICIENT_DATA',
      };
    }

    const mouthApertures = windows.map((w) => w.mouthAperture);
    const audioEnergies = windows.map((w) => w.audioEnergy);

    const mouthVariance = this.calculateVariance(mouthApertures);
    const audioVariance = this.calculateVariance(audioEnergies);

    // Guard: Audio energy is virtually zero (silent or muted microphone)
    if (audioVariance < 0.0001 && Math.max(...audioEnergies) < 0.05) {
      return {
        status: 'FAIL',
        syncScore: 0,
        visualFrameCount: windows.length,
        audioWindowCount: windows.length,
        mouthMovementVariance: Number(mouthVariance.toFixed(5)),
        audioEnergyVariance: Number(audioVariance.toFixed(5)),
        correlation: 0,
        reason: 'INSUFFICIENT_AUDIO_DATA',
      };
    }

    // Guard: Mouth aperture has no variance (static photo with loudspeaker / replay attack)
    if (mouthVariance < 0.0001) {
      return {
        status: 'FAIL',
        syncScore: 0,
        visualFrameCount: windows.length,
        audioWindowCount: windows.length,
        mouthMovementVariance: Number(mouthVariance.toFixed(5)),
        audioEnergyVariance: Number(audioVariance.toFixed(5)),
        correlation: 0,
        reason: 'STATIC_MOUTH_DETECTED',
      };
    }

    // Compute temporal correlation between mouth openness and audio energy
    const correlation = this.calculatePearsonCorrelation(mouthApertures, audioEnergies);

    // Normalize correlation [-1, 1] into a positive sync score [0, 1]
    const syncScore = Math.max(0, Math.min(1, (correlation + 1) / 2));

    let status: 'PASS' | 'FAIL' | 'UNCERTAIN' = 'FAIL';
    let reason: string | undefined = undefined;

    if (correlation >= this.PASS_CORRELATION_THRESHOLD) {
      status = 'PASS';
    } else if (correlation >= this.UNCERTAIN_LOWER_BOUND) {
      status = 'UNCERTAIN';
      reason = 'CORRELATION_MARGINAL';
    } else {
      status = 'FAIL';
      reason = 'LIP_AUDIO_DESYNCHRONIZED';
    }

    return {
      status,
      syncScore: Number(syncScore.toFixed(4)),
      visualFrameCount: windows.length,
      audioWindowCount: windows.length,
      mouthMovementVariance: Number(mouthVariance.toFixed(5)),
      audioEnergyVariance: Number(audioVariance.toFixed(5)),
      correlation: Number(correlation.toFixed(4)),
      reason,
    };
  }

  /**
   * Matches real recognizer-level and camera-contour events while allowing for
   * up to 300 ms of native/bridge timing skew. Each camera sample can be used
   * only once for a given offset, so this does not create duplicate evidence.
   */
  public static analyzeTimedSync(
    audio: TimedLevelSample[],
    mouth: TimedMouthSample[],
  ): AvSyncResult {
    let best: AvSyncResult | null = null;
    for (let offsetMs = -300; offsetMs <= 300; offsetMs += 50) {
      const usedMouthSamples = new Set<number>();
      const windows: AvSampleWindow[] = [];
      for (const audioSample of audio) {
        const targetTimestamp = audioSample.timestampMs + offsetMs;
        let nearestIndex = -1;
        let nearestDelta = Number.POSITIVE_INFINITY;
        for (let index = 0; index < mouth.length; index++) {
          if (usedMouthSamples.has(index)) continue;
          const delta = Math.abs(mouth[index].timestampMs - targetTimestamp);
          if (delta < nearestDelta) {
            nearestIndex = index;
            nearestDelta = delta;
          }
        }
        if (nearestIndex >= 0 && nearestDelta <= 150) {
          usedMouthSamples.add(nearestIndex);
          windows.push({
            timestampMs: audioSample.timestampMs,
            audioEnergy: audioSample.level,
            mouthAperture: mouth[nearestIndex].aperture,
          });
        }
      }

      const result = this.analyzeSync(windows);
      if (!best || result.status === 'PASS' || result.correlation > best.correlation ||
        (result.correlation === best.correlation && result.audioWindowCount > best.audioWindowCount)) {
        best = result;
      }
      if (result.status === 'PASS') return result;
    }

    return best ?? this.analyzeSync([]);
  }
}

export default AudioVideoSyncService;
