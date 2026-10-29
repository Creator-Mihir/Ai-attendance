import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { SpeechVerificationResult } from '../types/verification';

export interface SpeechAvailability {
  available: boolean;
  reason?: string;
  canInstallOfflineModel?: boolean;
}

type SpeechCallbacks = {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
  onAudioLevel?: (level: number) => void;
};

export class SpeechService {
  private static isListening = false;
  private static currentAudioLevel = 0;
  private static subscriptions: Array<{ remove: () => void }> = [];
  private static stopPromise: Promise<void> | null = null;
  private static stopResolver: (() => void) | null = null;
  private static callbacks: SpeechCallbacks | null = null;
  private static readonly MATCH_THRESHOLD = 0.75;
  private static readonly ANDROID_AS_PACKAGE = 'com.google.android.as';
  private static readonly ANDROID_LOCALE = 'en-US';

  private static getRecognitionLocale(): string | null {
    if (Platform.OS === 'android') return this.ANDROID_LOCALE;
    if (Platform.OS !== 'ios') return null;
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.replace('_', '-');
    // iOS exposes its on-device capability for the system-default locale. Use
    // that same locale for recognition so an unsupported en-US request cannot
    // silently fall back to network recognition.
    return /^en-[a-z]{2,}$/i.test(locale) ? locale : null;
  }

  public static normalizeText(text: string): string {
    if (!text) return '';
    return text.toLowerCase().replace(/[.,/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '').replace(/\s+/g, ' ').trim();
  }

  public static levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = s1[i - 1] === s2[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  public static evaluateSpeechMatch(params: {
    expected: string;
    recognized: string;
    durationMs?: number;
    threshold?: number;
  }): SpeechVerificationResult {
    const { expected, recognized, durationMs = 2800 } = params;
    const threshold = params.threshold ?? this.MATCH_THRESHOLD;
    const timestamp = new Date().toISOString();
    const normExpected = this.normalizeText(expected);
    const normRecognized = this.normalizeText(recognized);

    if (!normRecognized) {
      return {
        success: false, expectedText: expected, recognizedText: recognized,
        normalizedExpected: normExpected, normalizedRecognized: normRecognized,
        similarityScore: 0, confidence: 0, wordMatchRate: 0, durationMs, timestamp,
        rejectionReason: 'NO_SPEECH_DETECTED',
      };
    }

    const expectedTokens = normExpected.split(' ').filter(Boolean);
    const recognizedTokens = normRecognized.split(' ').filter(Boolean);
    let matchingTokens = 0;
    for (const token of expectedTokens) {
      if (recognizedTokens.includes(token)) matchingTokens++;
      else if (recognizedTokens.some((word) => word.length >= 4 && token.length >= 4 && this.levenshteinDistance(word, token) <= 1)) matchingTokens += 0.85;
    }
    const wordMatchRate = expectedTokens.length ? matchingTokens / expectedTokens.length : 0;
    const maxLen = Math.max(normExpected.length, normRecognized.length);
    const charSimilarity = maxLen ? (maxLen - this.levenshteinDistance(normExpected, normRecognized)) / maxLen : 0;
    const similarityScore = Number((wordMatchRate * 0.6 + charSimilarity * 0.4).toFixed(4));
    const confidence = Number(((similarityScore + wordMatchRate) / 2).toFixed(4));
    const success = similarityScore >= threshold && wordMatchRate >= 0.65;
    const rejectionReason = success ? undefined : wordMatchRate >= 0.25 && wordMatchRate < 0.65 ? 'INCOMPLETE_PHRASE' : 'SPEECH_MISMATCH';
    return {
      success, expectedText: expected, recognizedText: recognized,
      normalizedExpected: normExpected, normalizedRecognized: normRecognized,
      similarityScore, confidence, wordMatchRate: Number(wordMatchRate.toFixed(4)),
      durationMs, timestamp, rejectionReason,
    };
  }

  /** Strict capability check: never accepts a recognizer that might upload audio. */
  public static async checkOnDeviceAvailability(): Promise<SpeechAvailability> {
    if (Platform.OS === 'web') return { available: false, reason: 'OFFLINE_SPEECH_UNAVAILABLE_ON_WEB' };
    const locale = this.getRecognitionLocale();
    if (!locale) return { available: false, reason: 'OFFLINE_ENGLISH_SPEECH_REQUIRES_ENGLISH_DEVICE_LOCALE' };
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable() || !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
      return { available: false, reason: 'ON_DEVICE_SPEECH_RECOGNITION_UNAVAILABLE' };
    }
    if (Platform.OS === 'ios') {
      try {
        const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({});
        const supported = locales.installedLocales.some((item) => item.toLowerCase().replace('_', '-') === locale.toLowerCase());
        return supported ? { available: true } : { available: false, reason: 'ON_DEVICE_ENGLISH_LOCALE_UNAVAILABLE' };
      } catch {
        return { available: false, reason: 'ON_DEVICE_SPEECH_LOCALE_CHECK_FAILED' };
      }
    }
    if (Platform.OS !== 'android') return { available: false, reason: 'UNSUPPORTED_SPEECH_PLATFORM' };

    if (Number(Platform.Version) < 33) {
      return { available: false, reason: 'ANDROID_13_REQUIRED_FOR_VERIFIABLE_OFFLINE_SPEECH' };
    }
    try {
      const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({ androidRecognitionServicePackage: this.ANDROID_AS_PACKAGE });
      const installed = locales.installedLocales.some((item) => item.toLowerCase().replace('_', '-') === locale.toLowerCase());
      if (installed) return { available: true };
      const supported = locales.locales.some((item) => item.toLowerCase().replace('_', '-') === locale.toLowerCase());
      return {
        available: false,
        reason: supported ? 'OFFLINE_ENGLISH_MODEL_NOT_INSTALLED' : 'OFFLINE_ENGLISH_MODEL_UNSUPPORTED',
        canInstallOfflineModel: supported,
      };
    } catch {
      return { available: false, reason: 'OFFLINE_SPEECH_SERVICE_UNAVAILABLE' };
    }
  }

  public static async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const result = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
      return Boolean(result.granted);
    } catch {
      return false;
    }
  }

  public static async installOfflineEnglishModel(): Promise<string> {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 33) throw new Error('OFFLINE_MODEL_INSTALL_UNSUPPORTED');
    const result = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: this.ANDROID_LOCALE });
    return result.status;
  }

  public static getLiveAudioVolume(): number { return this.currentAudioLevel; }

  public static startListening(callbacks: SpeechCallbacks): void {
    if (Platform.OS === 'web') throw new Error('OFFLINE_SPEECH_UNAVAILABLE_ON_WEB');
    if (this.isListening) throw new Error('SPEECH_RECOGNITION_ALREADY_ACTIVE');
    this.callbacks = callbacks;
    this.currentAudioLevel = 0;
    let finalTranscript = '';

    this.subscriptions = [
      ExpoSpeechRecognitionModule.addListener('result', (event) => {
        const best = event.results[0]?.transcript?.trim() ?? '';
        if (event.isFinal) finalTranscript = [finalTranscript, best].filter(Boolean).join(' ').trim();
        callbacks.onResult([finalTranscript, event.isFinal ? '' : best].filter(Boolean).join(' ').trim(), event.isFinal);
      }),
      ExpoSpeechRecognitionModule.addListener('error', (event) => {
        const nativeCode = typeof event.code === 'number' ? ` (native code ${event.code})` : '';
        callbacks.onError(`SPEECH_${event.error.toUpperCase()}${nativeCode}: ${event.message}`);
      }),
      ExpoSpeechRecognitionModule.addListener('volumechange', (event) => {
        // Native recognizer reports -2..10 for the active recognition input.
        const level = event.value < 0 ? 0 : Math.max(0, Math.min(1, event.value / 10));
        this.currentAudioLevel = level;
        callbacks.onAudioLevel?.(level);
      }),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        this.isListening = false;
        callbacks.onEnd();
        this.removeListeners();
        this.stopResolver?.();
        this.stopResolver = null;
        this.stopPromise = null;
      }),
    ];

    try {
      ExpoSpeechRecognitionModule.start({
        lang: this.getRecognitionLocale() || this.ANDROID_LOCALE,
        interimResults: true,
        // On Android, continuous recognition can emit ERROR_CLIENT when stop()
        // is called, discarding the final phrase. A single challenge is one
        // utterance, so use the recognizer's natural final-result lifecycle.
        continuous: Platform.OS === 'ios',
        maxAlternatives: 1,
        requiresOnDeviceRecognition: true,
        androidRecognitionServicePackage: Platform.OS === 'android' ? this.ANDROID_AS_PACKAGE : undefined,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 150 },
      });
      this.isListening = true;
    } catch (error) {
      this.removeListeners();
      this.callbacks = null;
      throw error;
    }
  }

  /** Stops capture and waits for the native final result/end event before evaluation. */
  public static stopListening(): Promise<void> {
    if (!this.isListening) return Promise.resolve();
    if (this.stopPromise) return this.stopPromise;
    this.stopPromise = new Promise<void>((resolve) => {
      this.stopResolver = resolve;
      const timeout = setTimeout(() => {
        this.callbacks?.onError('SPEECH_STOP_TIMEOUT: native recognizer did not finalize the recording.');
        this.isListening = false;
        this.removeListeners();
        this.stopResolver = null;
        this.stopPromise = null;
        resolve();
      }, 3000);
      const originalResolver = this.stopResolver;
      this.stopResolver = () => { clearTimeout(timeout); originalResolver?.(); };
      try { ExpoSpeechRecognitionModule.stop(); }
      catch (error) {
        clearTimeout(timeout);
        this.callbacks?.onError(`SPEECH_STOP_FAILED: ${error instanceof Error ? error.message : 'native stop failed'}`);
        this.isListening = false;
        this.removeListeners();
        this.stopResolver = null;
        this.stopPromise = null;
        resolve();
      }
    });
    return this.stopPromise;
  }

  public static cancelListening(): void {
    if (this.isListening) {
      try { ExpoSpeechRecognitionModule.abort(); } catch { /* native session may already be closed */ }
    }
    this.isListening = false;
    this.removeListeners();
    this.stopResolver?.();
    this.stopResolver = null;
    this.stopPromise = null;
    this.callbacks = null;
    this.currentAudioLevel = 0;
  }

  private static removeListeners(): void {
    this.subscriptions.forEach((subscription) => subscription.remove());
    this.subscriptions = [];
    this.callbacks = null;
  }
}

export default SpeechService;
