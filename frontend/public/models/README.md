# Sprint 1 — MediaPipe model

- Name: official MediaPipe Gesture Recognizer, float16 bundle, version 1.
- Purpose: 21 hand landmarks and canned static hand categories; pinch is computed locally by our own geometry.
- Filename: `gesture_recognizer.task` (8,373,440 bytes).
- Official source: https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task
- Guide: https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer
- Model card: https://storage.googleapis.com/mediapipe-assets/gesture_recognizer/model_card_hand_gesture_classification_with_faireness_2022.pdf
- Download verified: 2026-09-30.
- SHA-256: `97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482`.
- License: the MediaPipe package/source is Apache-2.0. The linked model card does not state a separate model license; do not infer it from the documentation's license. The binary is therefore excluded from git and obtained from Google's official distribution by the reproducible script.

`npm run prepare:vision` verifies an existing file or downloads that exact version and verifies its checksum. `npm run dev` and `npm run build` run this automatically. A failed download or checksum fails preparation; no unverified model is used. First preparation requires Internet access on the developer/build host. The deployed static build already contains the model: visitors perform no installation or manual download.

WASM is copied from exact installed `@mediapipe/tasks-vision` 1.0.1 into `public/mediapipe/wasm`. Generated WASM is excluded from git. Vite copies both sets of assets into the build. `src/vision/core/config.ts` uses `import.meta.env.BASE_URL` for both paths, including deployments under a subdirectory. No CDN or floating version is used. MediaPipe license: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE
