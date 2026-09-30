# Side-view squat analysis

Scope: `frontend/src/vision/exercises/squat/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Count full squat cycles and evaluate the three implemented technique rules.

## Code rules

- config.ts owns profile/target/thresholds; features.ts extracts geometry; stateMachine.ts owns stable phases and cancellation.
- rules.ts evaluates depth_insufficient, too_fast and incomplete_extension; analyzer.ts emits unique rep/error events.
- Count only complete cycles; hold/jitter/timeout/tracking loss cannot invent repetitions.
- Five total cycles include rejected reps. Each technique code is unique per completed rep, and all three rules reject.
- resultBuilder.ts aggregates metrics and recommendations; preserve completed reps during recalibration.
- Use calibrated/aspect-correct finite geometry. Defaults require real-camera tuning and are not universal safety limits.

## Dependencies

Use vision/core, pose helpers/contracts and VisionEvent; no React, app modes, camera access, storage or external providers.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/exercises/squat src/vision/pose/__tests__/session.test.ts`; update synthetic fixtures and test multi-error cycles, incomplete reversal, standing resync and deterministic results.
