# Shared camera runtime tests

Scope: `frontend/src/features/workout/__tests__/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

runtime.test.ts covers serialized hand/pose model switching; renderer.test.ts covers pose projection and cleanup.

## Code rules

- Assert one camera/loop, late initializer disposal, stale scheduled callbacks, pose-mode reuse, hidden tabs and correct mirrored/DPR output.
- Use explicit monotonic timestamps and existing Vitest assertions. Keep tests independent of real cameras, model downloads and live providers.
- Test observable outputs and cleanup; retain assertions that reject accidental duplicate commands or reps.
- Restore mocked browser APIs, clocks and globals after each test. Synthetic acceptance does not establish real-camera reliability.

## Dependencies

Tests may import their subject and pure fixture/support contracts across layers; runtime modules must never import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/features/workout src/features/gesture-navigation/__tests__/overlays.test.tsx`, then `npm run type-check` and the broader frontend suite.

## Code example — late startup cleanup

Use the file’s mocked runtime setup. Disposing during startup must stop the arriving track and leave no model or animation loop.

From [runtime.test.ts](runtime.test.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
it('dispose before queued initialization starts avoids creating a model or requesting again', async () => {
    const s = setup();
    const pending = s.source.start();
    s.source.dispose();
    await pending;
    expect(s.handFactory).not.toHaveBeenCalled();
    expect(s.track.stop).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
})
```
