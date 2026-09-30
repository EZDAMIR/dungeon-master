# Application flow tests

Scope: `frontend/src/app/__tests__/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

modes.test.ts/flow.test.ts cover guarded actions and tutorial commands; poseFlow.test.ts and App.test.tsx cover semantic workout flow and rendered results.

## Code rules

- Test selection-before-confirm, calibration/countdown, pause/recovery, repeated/reset sessions and camera error behavior.
- Use explicit monotonic timestamps and existing Vitest assertions. Keep tests independent of real cameras, model downloads and live providers.
- Test observable outputs and cleanup; retain assertions that reject accidental duplicate commands or reps.
- Restore mocked browser APIs, clocks and globals after each test. Synthetic acceptance does not establish real-camera reliability.

## Dependencies

Tests may import their subject and pure fixture/support contracts across layers; runtime modules must never import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/app`, then `npm run type-check` and the broader frontend suite.
