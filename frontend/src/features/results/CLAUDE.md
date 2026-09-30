# Result synchronization projection

Scope: `frontend/src/features/results/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Project completed local results into aggregate-only Sprint 3 synchronization data. ResultsPage and pure squat resultBuilder retain presentation/counting responsibilities.

## Code rules

- Reduce completed per-repetition metrics once after the RESULTS transition; never retain raw frames or run network requests here.
- Display completed aggregate metrics and deterministic recommendations; never reconstruct reps from retained raw samples.
- Keep repeat/menu actions semantic and keep results visible without backend access.

## Dependencies

Use squat result contracts and shared UI; aggregation remains in vision/exercises/squat/resultBuilder.ts.

## Verification

Commands run from `frontend/` unless specified otherwise.
Test aggregate projection, accepted/rejected counts, unique error totals, immediate Results and offline preservation.
