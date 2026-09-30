# Exercise analyzers

Scope: `frontend/src/vision/exercises/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own pure exercise-specific state machines and result aggregation.

## Code rules

- Only squat/bodyweight_squat_side_v1 is implemented. Do not add another exercise before the current flow is stable and the work is authorized.
- Put features, configuration, rules, analyzer and result types beside the exercise that uses them.
- Consume normalized samples/calibration and emit semantic events; keep React, camera ownership and network I/O outside analyzers.
- Keep readiness failures distinct from technique rejection; do not claim medical safety or injury assessment.

## Dependencies

Use vision/core/pose contract helpers and VisionEvent. Avoid dependencies on another exercise or UI/runtime layers.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/exercises src/vision/pose/__tests__/session.test.ts`; exercise complete, partial, rejected and interrupted cycles.

## Code example — exercise-owned rules

Evaluate completed metrics in the implemented squat module. Keep named thresholds and error codes next to the exercise rather than in a page or generic UI helper.

From [rules.ts](squat/rules.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export function evaluateRep(metrics: RepMetrics, incomplete = false): TechniqueErrorCode[] {
    const errors: TechniqueErrorCode[] = [];
    if (metrics.minKneeAngle > c.bottomAngle)
        errors.push('depth_insufficient');
    if (metrics.descentDurationMs < c.minimumDescentMs || metrics.totalDurationMs < c.minimumRepMs)
        errors.push('too_fast');
    if (incomplete)
        errors.push('incomplete_extension');
    return errors;
}
```
