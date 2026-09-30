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

## Code example — hysteresis and rearming

Normalize by palm width, require consecutive entry samples and use a separate release threshold. Missing landmarks reset the candidate instead of confirming a command.

From [pinchDetector.ts](pinchDetector.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export class PinchDetector {
    private pinched = false;
    private consecutive = 0;
    update(landmarks: readonly HandLandmark[]) {
        const palm = landmarks[5] && landmarks[17] ? distance(landmarks[5], landmarks[17]) : 0;
        if (!Number.isFinite(palm) || palm < config.minPalmWidth || !landmarks[4] || !landmarks[8]) {
            this.reset();
            return { confirmed: false, progress: 0, pinched: false, valid: false };
        }
        const ratio = distance(landmarks[4], landmarks[8]) / palm;
        let confirmed = false;
        if (this.pinched) {
            if (ratio > config.pinchExitRatio)
                this.reset();
        }
        else {
            this.consecutive = ratio < config.pinchEnterRatio ? this.consecutive + 1 : 0;
            if (this.consecutive >= config.pinchSamples) {
                this.pinched = true;
                confirmed = true;
            }
        }
        return { confirmed, progress: clamp(this.consecutive / config.pinchSamples), pinched: this.pinched, valid: true };
    }
    reset() { this.pinched = false; this.consecutive = 0; }
}
```
