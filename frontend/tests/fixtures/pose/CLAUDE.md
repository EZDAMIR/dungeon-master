# Synthetic pose sequences

Scope: `frontend/tests/fixtures/pose/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Build and store side-view squat/calibration sequences without recording a person.

## Code rules

- builder.ts defines readable synthetic motions; profile.ts supplies a known calibration; generate.ts writes versioned JSON.
- Regenerate stored JSON from the builder when motion construction changes, and review the resulting timing/landmark diff.
- Preserve wrong-angle, cropped-body, jitter, correct/shallow/fast/incomplete cycles, loss and pause coverage.
- Do not alter rule thresholds inside the builder or add expected rep/error results to samples.
- Builders are used by tests and development fake replay; keep production guards intact.

## Dependencies

Use pure pose contracts, landmark helpers and fixture-local code; no camera/model initialization, React or external I/O except generate.ts writing JSON.

## Verification

Commands run from `frontend/` unless specified otherwise.
To regenerate synthetic JSON, run `npx --no-install vite-node tests/fixtures/pose/generate.ts` from frontend and review the diff. Run `npm run test -- src/vision/pose src/vision/exercises/squat src/app/__tests__/poseFlow.test.ts`.

## Code example — typed fixture baseline

Keep the baseline provider-neutral and versioned. Generate motion frames with builder.ts and regenerate JSON through generate.ts; do not encode expected rep counts into input landmarks.

From [profile.ts](profile.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export const profile: CalibrationProfile = { version: 'squat-calibration-v1', activeSide: 'left', standingKneeAngle: 178, standingHipAngle: 178, baselineTorsoTilt: 0, bodyScale: .8, sideViewScore: .95, createdAt: 0 };
```
