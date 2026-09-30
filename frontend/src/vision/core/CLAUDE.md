# Shared vision primitives

Scope: `frontend/src/vision/core/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own camera lifecycle, clocks, named runtime configuration, geometry, smoothing and hold gates.

## Code rules

- camera.ts is a browser I/O adapter; keep getUserMedia, video play/readiness, typed errors and track cleanup here.
- geometry.ts, smoothing.ts, holdGate.ts and clock.ts are reusable deterministic primitives with explicit timestamps.
- Keep gesture/exercise-specific thresholds in their own configuration; core configuration contains runtime and asset settings.
- Do not access DOM targets, navigate the app or upload video/landmarks.

## Dependencies

Pure primitives use local/provider-neutral types only. camera.ts may use browser APIs; no core module imports React, app, pages, features or backend clients.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/core src/vision/gestures/__tests__/gestures.test.ts src/vision/pose/__tests__/pose.test.ts`; cover degenerate geometry, hold release/cooldown and late camera disposal.

## Code example — finite deterministic geometry

Handle degenerate vectors before dividing, and clamp the cosine before acos. Pure geometry receives points rather than reading video or React state.

From [geometry.ts](geometry.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export function angleDegrees(a: Point, b: Point, c: Point): number {
    const u = { x: a.x - b.x, y: a.y - b.y }, v = { x: c.x - b.x, y: c.y - b.y };
    const length = Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y);
    if (!Number.isFinite(length) || length < 1e-9)
        return 0;
    return Math.acos(clamp((u.x * v.x + u.y * v.y) / length, -1, 1)) * 180 / Math.PI;
}
```
