# Results feature reservation

Scope: `frontend/src/features/results/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Reserve reusable results interactions; ResultsPage and the pure squat resultBuilder currently implement results.

## Code rules

- This is a placeholder; extract reusable result UI only when requested or shared by real consumers.
- Display completed aggregate metrics and deterministic recommendations; never reconstruct reps from retained raw samples.
- Keep repeat/menu actions semantic and keep results visible without backend access.

## Dependencies

Use squat result contracts and shared UI; aggregation remains in vision/exercises/squat/resultBuilder.ts.

## Verification

Commands run from `frontend/` unless specified otherwise.
When implemented, test accepted/rejected counts, unique error totals, repeat reset and offline results.
