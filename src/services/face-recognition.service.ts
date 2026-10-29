import { TeacherProfile } from '../types/teacher';
import { FaceRecognitionResult, FaceBoundingBox } from '../types/verification';
import { AppConfig } from '../constants/config';
import { CameraCaptureResult } from '../types/hardware';
import { extractNativeFaceEmbedding } from './face-model.runtime';

export const FACE_MODEL_VERSION = 'MobileFaceNet-192d-Apache2-v1';
const EXPECTED_EMBEDDING_DIMENSIONS = 192;

type EmbeddingExtraction = {
  detected: boolean;
  embedding?: number[];
  boundingBox?: FaceBoundingBox;
  error?: string;
  faceCount?: number;
  diagnostic?: string;
};

export class FaceRecognitionService {
  private static readonly DEFAULT_THRESHOLD = AppConfig.verification.minFaceMatchScore;

  public static calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      if (!Number.isFinite(vecA[i]) || !Number.isFinite(vecB[i])) return 0;
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;

    const cosine = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, (cosine + 1) / 2));
  }

  public static async extractEmbeddingFromFrame(
    frame: CameraCaptureResult | string
  ): Promise<EmbeddingExtraction> {
    try {
      const imageUri = typeof frame === 'string' ? frame : frame.uri;
      if (!imageUri || imageUri.startsWith('data:')) {
        return { detected: false, error: 'FACE_CAPTURE_UNAVAILABLE', diagnostic: 'No local image file URI was provided to the native detector.' };
      }
      if (typeof frame !== 'string' && (!frame.base64 || frame.width <= 0 || frame.height <= 0 || frame.sizeBytes <= 0)) {
        return { detected: false, error: 'CAMERA_CAPTURE_INVALID', diagnostic: 'The camera result is missing image data, dimensions, or a verified file size.' };
      }
      const extracted = await extractNativeFaceEmbedding(imageUri);
      const frameInfo = typeof frame === 'string'
        ? 'Local image file'
        : `Captured ${frame.width}×${frame.height} ${frame.format.toUpperCase()} (${Math.round(frame.sizeBytes / 1024)} KB)`;
      if (extracted.faceCount === 0) {
        return { detected: false, error: 'NO_FACE_DETECTED', faceCount: 0, diagnostic: `${frameInfo}; on-device ML Kit processed the image and returned 0 faces.` };
      }
      if (extracted.faceCount !== 1) {
        return { detected: false, error: 'MULTIPLE_FACES', faceCount: extracted.faceCount, diagnostic: `${frameInfo}; on-device ML Kit detected ${extracted.faceCount} faces.` };
      }
      const vector = extracted.vector;
      if (
        vector.length !== EXPECTED_EMBEDDING_DIMENSIONS ||
        vector.some((value) => !Number.isFinite(value))
      ) {
        throw new Error('FACE_MODEL_OUTPUT_INVALID: MobileFaceNet returned an unexpected embedding.');
      }
      const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
      if (!Number.isFinite(norm) || norm === 0) {
        throw new Error('FACE_MODEL_OUTPUT_INVALID: MobileFaceNet returned a zero or invalid embedding.');
      }

      return { detected: true, embedding: vector.map((value) => value / norm), faceCount: 1, diagnostic: `${frameInfo}; on-device ML Kit detected 1 face and MobileFaceNet produced a ${vector.length}-value embedding.` };
    } catch (error) {
      return {
        detected: false,
        error: error instanceof Error ? error.message : 'FACE_MODEL_UNAVAILABLE',
      };
    }
  }

  public static async verifyTeacherIdentity(params: {
    teacher: TeacherProfile;
    capturedFrame: CameraCaptureResult | string;
    threshold?: number;
    liveVector?: number[];
    forceNoFace?: boolean;
    multipleFacesDetected?: boolean;
  }): Promise<FaceRecognitionResult> {
    const { teacher } = params;
    const threshold = params.threshold ?? this.DEFAULT_THRESHOLD;
    const timestamp = new Date().toISOString();
    const fail = (reason: string, matchScore = 0): FaceRecognitionResult => ({
      success: false,
      teacherId: teacher.id,
      matchScore,
      threshold,
      modelVersion: FACE_MODEL_VERSION,
      timestamp,
      reason,
    });

    if (!teacher.faceRegistered || !teacher.faceEmbedding?.vector) return fail('ENROLLMENT_MISSING');
    if (teacher.faceEmbedding.version !== FACE_MODEL_VERSION) return fail('ENROLLMENT_MODEL_MISMATCH');
    if (params.forceNoFace) return fail('NO_FACE_DETECTED');
    if (params.multipleFacesDetected) return fail('MULTIPLE_FACES');

    const extraction = await this.extractEmbeddingFromFrame(params.capturedFrame);
    if (!extraction.detected || !extraction.embedding) {
      return fail(extraction.error || 'FACE_MODEL_UNAVAILABLE');
    }
    const reference = teacher.faceEmbedding.vector;
    if (
      reference.length !== EXPECTED_EMBEDDING_DIMENSIONS ||
      reference.some((value) => !Number.isFinite(value))
    ) {
      return fail('ENROLLMENT_INVALID');
    }

    const matchScore = this.calculateCosineSimilarity(extraction.embedding, reference);
    const success = matchScore >= threshold;
    return {
      success,
      teacherId: teacher.id,
      matchScore,
      threshold,
      modelVersion: FACE_MODEL_VERSION,
      timestamp,
      reason: success ? undefined : 'FACE_MISMATCH',
      detectedEmbedding: extraction.embedding,
    };
  }
}

export default FaceRecognitionService;
