export const visionConfig = {
  inferenceIntervalMs: 55,
  cursorGraceMs: 180,
  handStableMs: 350,
  hudIntervalMs: 100,
  minHandDetectionConfidence: .5,
  minHandPresenceConfidence: .5,
  minTrackingConfidence: .5,
}
export const visionAssets = {
  model: `${import.meta.env.BASE_URL}models/gesture_recognizer.task`,
  wasm: `${import.meta.env.BASE_URL}mediapipe/wasm`,
}
