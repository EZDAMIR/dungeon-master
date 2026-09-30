# Pose calibration and session

Scope: `frontend/src/vision/pose/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own provider-neutral pose samples, readiness, calibration, smoothing and local pose-session orchestration.

## Code rules

- poseRecognizer.ts isolates MediaPipe; landmarks/types/config define indices, contracts and named defaults.
- readiness/calibration select and lock the active side, require visible body and side view, and collect a stable standing baseline.
- smoothing rejects jumps without averaging away missing visibility. Countdown requires continued standing readiness.
- session.ts coordinates calibration/countdown/workout/paused stages, tracking recovery and semantic feedback; it does not navigate.
- pauseGesture owns standing hands-up hold/release/cooldown. Tracking loss cancels partial cycles and preserves completed metrics.
- Readiness failures must not create repetitions or technique-error counts.

## Dependencies

Use vision/core, squat analyzer, feedback policy and VisionEvent. Only poseRecognizer imports MediaPipe/browser video; no React/app/features/API imports.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/pose src/app/__tests__/poseFlow.test.ts`; update synthetic pose fixtures and cover calibration gaps, wrong angle, countdown cancellation, recovery and pause.
