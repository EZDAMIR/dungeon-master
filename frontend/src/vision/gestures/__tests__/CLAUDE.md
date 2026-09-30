# Pure gesture and adapter tests

Scope: `frontend/src/vision/gestures/__tests__/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

gestures.test.ts replays synthetic input through deterministic rules; adapter.test.ts mocks MediaPipe normalization/init/close.

## Code rules

- Cover pinch enter/exit jitter, release/cooldown, lost-hand reset, cursor mapping and one GPU-to-CPU initialization fallback.
- Use explicit monotonic timestamps and existing Vitest assertions. Keep tests independent of real cameras, model downloads and live providers.
- Test observable outputs and cleanup; retain assertions that reject accidental duplicate commands or reps.
- Restore mocked browser APIs, clocks and globals after each test. Synthetic acceptance does not establish real-camera reliability.

## Dependencies

Tests may import their subject and pure fixture/support contracts across layers; runtime modules must never import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/gestures`, then `npm run type-check` and the broader frontend suite.

## Code example — one confirmation per stable pinch

Replay the normalized pinch fixture through the detector; assert entry stability and the number of confirmed events rather than private fields.

From [gestures.test.ts](gestures.test.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
it('requires three samples, fires once, releases and re-arms', () => {
    const p = new PinchDetector();
    const hits = pinch.frames.map((ratio) => p.update(sample(0, ratio).landmarks).confirmed);
    expect(hits.filter(Boolean)).toHaveLength(2);
    expect(hits[1]).toBe(false);
    expect(hits[3]).toBe(true);
})
```
