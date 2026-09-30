# Camera lifecycle tests

Scope: `frontend/src/vision/core/__tests__/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

camera.test.ts mocks getUserMedia, media tracks, video playback and browser lifecycle.

## Code rules

- Cover permission denial, device errors, ended tracks, play failure and disposal while permission/startup is pending.
- Use explicit monotonic timestamps and existing Vitest assertions. Keep tests independent of real cameras, model downloads and live providers.
- Test observable outputs and cleanup; retain assertions that reject accidental duplicate commands or reps.
- Restore mocked browser APIs, clocks and globals after each test. Synthetic acceptance does not establish real-camera reliability.

## Dependencies

Tests may import their subject and pure fixture/support contracts across layers; runtime modules must never import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/core`, then `npm run type-check` and the broader frontend suite.

## Code example — late camera disposal

Use the mocked camera setup, dispose before startup resolves, then assert track cleanup and absence of a ready event.

From [camera.test.ts](camera.test.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
it('stops a stream that arrives after disposal', async () => {
    const s = setup();
    const pending = s.camera.start();
    s.camera.dispose();
    await pending;
    expect(s.track.stop).toHaveBeenCalledOnce();
    expect(s.events.some(e => e.type === 'camera.ready')).toBe(false);
})
```
