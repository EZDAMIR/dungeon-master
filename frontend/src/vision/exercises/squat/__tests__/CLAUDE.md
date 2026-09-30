# Squat rule and cycle tests

Scope: `frontend/src/vision/exercises/squat/__tests__/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

squat.test.ts exercises pure features/state machine/analyzer/result aggregation using synthetic pose sequences.

## Code rules

- Cover complete versus partial cycles, duplicate prevention, timeouts, three rejecting rules, unique multiple errors, incomplete reversal and standing resynchronization.
- Use explicit monotonic timestamps and existing Vitest assertions. Keep tests independent of real cameras, model downloads and live providers.
- Test observable outputs and cleanup; retain assertions that reject accidental duplicate commands or reps.
- Restore mocked browser APIs, clocks and globals after each test. Synthetic acceptance does not establish real-camera reliability.

## Dependencies

Tests may import their subject and pure fixture/support contracts across layers; runtime modules must never import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/exercises/squat`, then `npm run type-check` and the broader frontend suite.
