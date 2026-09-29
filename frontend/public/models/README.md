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

## Sprint 2 — Pose Landmarker Lite

- Name/type: official MediaPipe Pose Landmarker Lite, float16 task bundle, version 1; detector plus 33-point pose landmark model.
- File: `pose_landmarker_lite.task` (5,777,746 bytes).
- Official pinned source: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
- Official guide: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
- Download and checksum verified: 2026-09-30.
- Expected SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`.
- Purpose: browser-local side-view calibration, skeleton overlay and the single `bodyweight_squat_side_v1` exercise profile.
- Lite is selected to reduce browser inference cost for the demo. It is not a claim of clinical accuracy; heavier models have not been compared on this environment's hardware.
- The team did not train or fine-tune this model.
- License information: the installed MediaPipe package/source is Apache-2.0. The binary download does not carry a separate license statement; no separate binary license is inferred from the documentation license. Obtain it from the official distribution. Both task binaries remain excluded from git.

Sprint 2 preparation verifies both pinned task files. Correct assets are reused without a download. A missing or corrupt local file is downloaded again; an unexpected downloaded SHA-256 is a fatal error and is never installed. Temporary downloads are atomically renamed and cleaned up. WASM is copied from exact installed `@mediapipe/tasks-vision` 1.0.1. Clean clone → `npm ci` → `npm run build` automatically prepares both models and WASM, including non-root Vite base paths. The Pose adapter uses `VIDEO`, `numPoses=1`, no segmentation masks, tries GPU, and retries CPU once on initialization failure. Models are created once per active recognizer lifecycle and closed on switching.
