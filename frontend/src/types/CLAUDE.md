# Semantic contracts

Scope: `frontend/src/types/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Define the provider-neutral VisionEvent discriminated union used across frontend layers.

## Code rules

- Use literal event discriminants and explicit payload types; keep all timestamps on the source's monotonic clock.
- Events carry semantic commands/calibration/rep/feedback/results, never raw frames or continuous landmarks.
- Add an event together with producer, mapper/consumer and deterministic tests; do not duplicate the event union in a feature.
- Preserve narrow domain type imports; this folder contains contracts rather than runtime behavior.

## Dependencies

Type-only imports from pose/squat contracts are allowed. Do not import React, provider objects, app state or UI runtime.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run type-check` and the relevant producer/mapper tests; confirm incompatible payloads cannot compile.

## Code example — literal command contracts

Use a literal union so invalid commands fail type checking. VisionEvent in this module adds the event discriminator, monotonic timestamp and command-specific payload.

From [vision.ts](vision.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export type GestureCommand = 'select' | 'back' | 'confirm';
```
