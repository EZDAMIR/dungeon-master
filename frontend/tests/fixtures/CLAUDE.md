# Landmark fixtures

Scope: `frontend/tests/fixtures/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Store compact, synthetic, provider-neutral landmark sequences for deterministic behavior tests.

## Code rules

- Use versioned JSON with fps and frames containing monotonic at_ms and normalized landmarks.
- Hand fixtures cover pinch/noise/hold/loss; pose fixtures cover calibration, valid/rejected reps, recovery and pause.
- Document changes through readable builder inputs and behavior assertions; do not hand-adjust samples solely to make a failing rule pass.
- Never commit identifiable movement recordings, images or personal health data.

## Dependencies

Use hand/pose sample contracts and pure builders; fixtures must not initialize MediaPipe, camera, React or network clients.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run consuming gesture/pose/squat tests and inspect fixture diffs for expected sequence and timing changes.

## Code example — known synthetic calibration

Use a typed baseline with an explicit active side and monotonic createdAt. This calibration is synthetic test support; it is not evidence that live-camera defaults are tuned.

From [profile.ts](pose/profile.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export const profile: CalibrationProfile = { version: 'squat-calibration-v1', activeSide: 'left', standingKneeAngle: 178, standingHipAngle: 178, baselineTorsoTilt: 0, bodyScale: .8, sideViewScore: .95, createdAt: 0 };
```
