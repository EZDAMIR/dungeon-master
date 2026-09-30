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

## Code example — count completed cycles and emit events

This is SquatAnalyzer.update. The state machine produces completed metrics before a repetition is appended. Each rule produces one correction; reaching the configured total ends the local set.

From [analyzer.ts](analyzer.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
update(sample: PoseRecognitionSample): VisionEvent[] {
    if (this.finished)
        return [];
    this.start ??= sample.at;
    const f = squatFeatures(sample, this.profile.activeSide, this.previous, this.profile.bodyScale);
    this.previous = f;
    const phase = this.phase, completed = this.machine.update(f), events: VisionEvent[] = [];
    if (phase !== this.phase)
        events.push({ type: 'workout.phase_changed', at: sample.at, phase: this.phase });
    if (completed) {
        const errors = evaluateRep(completed.metrics, completed.incomplete), rep: RepResult = { index: this.reps.length + 1, accepted: !errors.length, errors, metrics: completed.metrics };
        this.reps.push(rep);
        events.push({ type: 'workout.rep_completed', at: sample.at, repIndex: rep.index, accepted: rep.accepted, errors, metrics: rep.metrics });
        for (const code of errors)
            events.push({ type: 'workout.technique_error', at: sample.at, code, correction: corrections[code], severity: 'warning' });
        if (this.reps.length >= c.targetReps) {
            this.finished = true;
            events.push({ type: 'workout.completed', at: sample.at, result: buildResult(this.reps, sample.at - this.start) });
        }
    }
    return events;
}
```
