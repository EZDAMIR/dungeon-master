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
