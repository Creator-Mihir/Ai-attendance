/** Unsupported runtimes remain fail-closed; native builds resolve the .native implementation. */
export async function extractNativeFaceEmbedding(_imageUri: string): Promise<{ vector: number[]; faceCount: number }> {
  throw new Error('FACE_RUNTIME_UNAVAILABLE: face matching requires an Android or iOS native build.');
}
