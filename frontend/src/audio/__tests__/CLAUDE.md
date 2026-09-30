# Audio behavior tests

Scope: `frontend/src/audio/__tests__/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

workoutAudio.test.ts exercises local speech/tone scheduling with browser APIs mocked.

## Code rules

- Cover mute, ordinary cooldown, critical interruption, voice absence and speech failure without interrupting visual behavior.
- Use explicit monotonic timestamps and existing Vitest assertions. Keep tests independent of real cameras, model downloads and live providers.
- Test observable outputs and cleanup; retain assertions that reject accidental duplicate commands or reps.
- Restore mocked browser APIs, clocks and globals after each test. Synthetic acceptance does not establish real-camera reliability.

## Dependencies

Tests may import their subject and pure fixture/support contracts across layers; runtime modules must never import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/audio`, then `npm run type-check` and the broader frontend suite.

## Code example — audio failure isolation

Mock unavailable browser speech and assert semantic handling still completes. Restore mocked globals in afterEach.

From [workoutAudio.test.ts](workoutAudio.test.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
it('speech and tone failures leave semantic handling usable', async () => {
    Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => { throw new Error('unavailable'); } }, configurable: true });
    const audio = new WorkoutAudio();
    await audio.enable();
    expect(() => audio.event({ type: 'workout.countdown', at: 1000, count: 0 })).not.toThrow();
    audio.close();
})
```
