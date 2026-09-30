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

## Code example — reduce completed metrics once

Project finite completed repetition metrics at the Results boundary. Return a defined zero for an empty set; do not retain landmarks or start network requests in this calculation.

From [sessionAggregate.ts](sessionAggregate.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
// Reduce completed rep metrics once at the Results boundary; do not retain samples.
export function meanMinKneeAngle(reps: readonly RepResult[]): number {
    return reps.length ? reps.reduce((total, rep) => total + rep.metrics.minKneeAngle, 0) / reps.length : 0;
}
```
