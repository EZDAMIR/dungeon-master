// Implementation defaults for the local demo; pending real-camera tuning.
export const poseConfig = {
 inferenceIntervalMs:55, detectionConfidence:.5, presenceConfidence:.5, trackingConfidence:.5,
 visibility:.65, margin:.025, minBodyHeight:.45, sideEnter:.72, sideExit:.62,
 sideStableMs:400, bodyStableMs:400, angleStableMs:500, baselineMs:900,
 standingMinAngle:160, standingMotion:.025, smoothingAlpha:.45, maxJump:.16,
 readinessWindow:5, readinessBadSamples:3, recoveryMs:400, trackingLostMs:500, trackingSignalMs:150, maxSampleGapMs:250,
 semanticIntervalMs:200, pauseHoldMs:800, pauseReleaseMs:250, pauseCooldownMs:1000,
 countdownMs:3000, startDisplayMs:350, audioCooldownMs:3000, feedbackMs:3500, positiveFeedbackMs:1500,
}
export const poseAssets = {model:`${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`}
