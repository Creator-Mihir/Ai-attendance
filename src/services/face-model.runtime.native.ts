import { Asset } from 'expo-asset';
import { NitroRecognizer } from '@nitro-mlkit/face-recognition';

const BUNDLED_MODEL = require('../../assets/models/mobilefacenet.tflite');
let modelLoad: Promise<void> | null = null;

async function ensureModelLoaded(): Promise<void> {
  if (!NitroRecognizer.isSupported()) {
    throw new Error('FACE_RUNTIME_UNAVAILABLE: native face recognition is not supported on this platform.');
  }
  if (NitroRecognizer.isModelReady()) return;
  if (!modelLoad) {
    modelLoad = (async () => {
      const modelAsset = Asset.fromModule(BUNDLED_MODEL);
      await modelAsset.downloadAsync();
      if (!modelAsset.localUri) {
        throw new Error('FACE_MODEL_UNAVAILABLE: bundled MobileFaceNet asset has no local file URI.');
      }
      const loaded = await NitroRecognizer.loadModel(modelAsset.localUri);
      if (!loaded || !NitroRecognizer.isModelReady()) {
        throw new Error('FACE_MODEL_UNAVAILABLE: MobileFaceNet could not be loaded by the on-device runtime.');
      }
    })().catch((error) => {
      modelLoad = null;
      throw error;
    });
  }
  await modelLoad;
}

export async function extractNativeFaceEmbedding(imageUri: string): Promise<{ vector: number[]; faceCount: number }> {
  await ensureModelLoaded();
  if (!imageUri || imageUri.startsWith('data:')) {
    throw new Error('FACE_CAPTURE_UNAVAILABLE: a local camera image file is required.');
  }

  const [detection] = await NitroRecognizer.findPeopleInPhotos([imageUri], {
    targetSize: 1024,
    allowNetworkAccess: false,
  });
  if (!detection?.success) {
    throw new Error(`FACE_DETECTION_FAILED: ${detection?.error || 'native face detector failed.'}`);
  }
  if (detection.totalFaces !== 1) {
    return { vector: [], faceCount: detection.totalFaces };
  }

  const result = await NitroRecognizer.extractEmbedding(imageUri);
  return { vector: result.vector, faceCount: detection.totalFaces };
}
