# Hand recognition and commands

Scope: `frontend/src/vision/gestures/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Normalize hand samples and produce cursor, pinch, fist-back and thumb-up-confirm events.

## Code rules

- gestureRecognizer.ts isolates MediaPipe hand adapter I/O; copy results into provider-neutral samples and close resources.
- gestureConfig.ts owns hand thresholds. cursorMapper, pinchDetector and gestureEngine own deterministic post-processing.
- Preserve normalized pinch hysteresis, entry stability and command hold/release/cooldown; never confirm from a single frame.
- Reset tracking and command candidates on loss; continue cursor movement during command cooldown.
- Emit commands without querying targets or calling DOM .click(); the UI registry supplies focused target IDs.

## Dependencies

Use vision/core, local hand types and VisionEvent. Only the recognizer adapter may depend on MediaPipe/browser video; no React/app/API imports.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/gestures`; update hand fixtures for rule changes and cover jitter, release, duplicate prevention and loss.
