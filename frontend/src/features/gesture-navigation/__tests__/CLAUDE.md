# Gesture UI and source tests

Scope: `frontend/src/features/gesture-navigation/__tests__/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

store.test.ts, source.test.ts and overlays.test.ts exercise target/HUD state, hand lifecycle and canvas/cursor presentation.

## Code rules

- Assert letterboxing, single mirroring, DPR, animation/listener cleanup, release/loss and cancelled or late startup.
- Use explicit monotonic timestamps and existing Vitest assertions. Keep tests independent of real cameras, model downloads and live providers.
- Test observable outputs and cleanup; retain assertions that reject accidental duplicate commands or reps.
- Restore mocked browser APIs, clocks and globals after each test. Synthetic acceptance does not establish real-camera reliability.

## Dependencies

Tests may import their subject and pure fixture/support contracts across layers; runtime modules must never import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/features/gesture-navigation`, then `npm run type-check` and the broader frontend suite.

## Code example — keep frame data outside React snapshots

Assert that repeated cursor samples update mutable presentation without publishing a global render snapshot.

From [store.test.ts](store.test.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
it('cursor movement does not publish React snapshots on every frame', () => {
    const store = new GestureStore(), callback = vi.fn();
    store.subscribe(callback);
    for (let at = 0; at < 100; at++)
        store.emit({ type: 'cursor.moved', at, x: at, y: at });
    expect(callback).not.toHaveBeenCalled();
    expect(store.cursor).toMatchObject({ x: 99, y: 99 });
})
```
