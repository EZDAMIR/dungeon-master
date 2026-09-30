# Pose and session tests

Scope: `frontend/src/vision/pose/__tests__/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

pose.test.ts exercises geometry/calibration/readiness/pause/policy; session.test.ts replays JSON; adapter.test.ts mocks MediaPipe.

## Code rules

- Cover stable side/baseline gates, visibility/outliers, countdown cancellation, completed metric preservation, recovery, pause and feedback expiry.
- Use explicit monotonic timestamps and existing Vitest assertions. Keep tests independent of real cameras, model downloads and live providers.
- Test observable outputs and cleanup; retain assertions that reject accidental duplicate commands or reps.
- Restore mocked browser APIs, clocks and globals after each test. Synthetic acceptance does not establish real-camera reliability.

## Dependencies

Tests may import their subject and pure fixture/support contracts across layers; runtime modules must never import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/pose`, then `npm run type-check` and the broader frontend suite.
