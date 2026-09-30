# Synthetic hand sequences

Scope: `frontend/tests/fixtures/hand/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Describe pinch hysteresis, command holds and hand loss using normalized hand samples.

## Code rules

- Keep pinch.json, noisy-pinch.json, fist-hold.json, thumb-up-hold.json and hand-lost.json deterministic.
- Preserve monotonic frame timing and provider-neutral landmarks/categories.
- Add early-release, jitter or recovery sequences when changing related gesture behavior.
- Do not use real hand recordings or encode expected application actions into input fixtures.

## Dependencies

Fixtures feed vision/gestures tests; they do not depend on UI navigation or provider initialization.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/gestures src/features/gesture-navigation`; verify the fixture establishes the intended trigger and nontrigger behavior.

## Code example — pinch enter, hold, release and reenter

The real pinch fixture stores normalized ratios, not full landmark frames. The consuming sample builder converts them into coordinates at explicit test timestamps. Repeated 0.25 entries exercise stability; 0.46 releases the pinch.

From [pinch.json](pinch.json). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```json
{
  "version": 1,
  "frames": [
    0.6,
    0.25,
    0.25,
    0.25,
    0.25,
    0.46,
    0.25,
    0.25,
    0.25
  ]
}
```
