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

## Code example — a complete cycle counts once

Replay the file’s synthetic correct-squat sequence and assert one accepted repetition and the public phase events.

From [squat.test.ts](squat.test.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
it('one correct cycle counts once with each state transition', () => {
    const { events } = run('correct-squat');
    expect(reps(events)).toHaveLength(1);
    expect(reps(events)[0].accepted).toBe(true);
    expect(events.filter(e => e.type === 'workout.phase_changed').map(e => e.phase)).toEqual(['standing', 'descending', 'bottom', 'ascending', 'standing']);
})
```
