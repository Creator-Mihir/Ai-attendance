import { detectFaces } from '@rbayuokt/expo-face-vision';
import type { FaceContours } from '@rbayuokt/expo-face-vision';

/** Measures mouth opening from native lip contours in a single captured frame. */
export class MouthMotionService {
  public static async measureAperture(imageUri: string): Promise<number> {
    if (!imageUri || imageUri.startsWith('data:')) {
      throw new Error('MOUTH_FRAME_UNAVAILABLE: a local camera image is required.');
    }

    const result = await detectFaces(imageUri, {
      performanceMode: 'fast',
      landmarks: true,
      contours: true,
      minFaceSize: 0.15,
    });
    if (result.faces.length !== 1) {
      throw new Error(result.faces.length === 0 ? 'MOUTH_FACE_NOT_DETECTED' : 'MOUTH_MULTIPLE_FACES');
    }

    return this.measureApertureFromContours(result.faces[0].contours);
  }

  /** Measures mouth opening from contours on a real-time camera frame. */
  public static measureApertureFromContours(contours?: FaceContours): number {
    const innerLip = contours?.innerLips;
    const outerLip = contours?.outerLips;
    if (!innerLip || innerLip.length < 4 || !outerLip || outerLip.length < 4) {
      throw new Error('MOUTH_CONTOUR_UNAVAILABLE: native detector did not return usable lip contours.');
    }

    const innerYs = innerLip.map((point) => point.y);
    const outerXs = outerLip.map((point) => point.x);
    if ([...innerYs, ...outerXs].some((value) => !Number.isFinite(value))) {
      throw new Error('MOUTH_CONTOUR_INVALID: detector returned non-finite lip coordinates.');
    }

    const opening = Math.max(...innerYs) - Math.min(...innerYs);
    const mouthWidth = Math.max(...outerXs) - Math.min(...outerXs);
    if (mouthWidth <= 0 || opening < 0) {
      throw new Error('MOUTH_CONTOUR_INVALID: detector returned invalid lip geometry.');
    }

    return Math.min(1, opening / mouthWidth);
  }
}

export default MouthMotionService;
