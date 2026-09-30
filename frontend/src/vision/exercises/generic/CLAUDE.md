# Sprint 4A universal pose interpreter

Extends [exercise guide](../CLAUDE.md). No React, camera ownership, provider or network I/O.
Use bounded declarative schema, explicit math operations, and one held transition per sample.
Tracking interruption cancels partials and preserves completed aggregates. Validate before use.

Example from [validator.ts](validator.ts):
```ts
const parsed = validateSpec(value)
if (!parsed.valid) return null
```
Run `npm run test -- src/vision/exercises/generic` and `npm run type-check`.
