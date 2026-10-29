# Bundled face embedding model

- Model: MobileFaceNet, TensorFlow Lite, 112×112 RGB input, 192-value output
- Runtime: on-device only through `@nitro-mlkit/face-recognition`
- Source: [hugocornellier/face_detection_tflite](https://github.com/hugocornellier/face_detection_tflite), `assets/models/mobilefacenet.tflite`
- Model repository license: Apache-2.0; full text is in `MODEL-LICENSE.txt`
- SHA-256: `be4bc7cfc53f7bc336d0f28b1ab92535f618c913a422b683210750f6b5354854`

The model is bundled so inference works without fetching weights at runtime. Its output is a face embedding, not proof of liveness. The current detector does not report head pose or a calibrated image-quality score. Thresholds require validation on representative devices and users before production use.
