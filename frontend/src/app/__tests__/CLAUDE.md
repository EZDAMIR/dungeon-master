# Application flow tests

Scope: `frontend/src/app/__tests__/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

modes.test.ts/flow.test.ts cover guarded actions and tutorial commands; poseFlow.test.ts and App.test.tsx cover semantic workout flow and rendered results.

## Code rules

- Test selection-before-confirm, calibration/countdown, pause/recovery, repeated/reset sessions and camera error behavior.
- Use explicit monotonic timestamps and existing Vitest assertions. Keep tests independent of real cameras, model downloads and live providers.
- Test observable outputs and cleanup; retain assertions that reject accidental duplicate commands or reps.
- Restore mocked browser APIs, clocks and globals after each test. Synthetic acceptance does not establish real-camera reliability.

## Dependencies

Tests may import their subject and pure fixture/support contracts across layers; runtime modules must never import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/app`, then `npm run type-check` and the broader frontend suite.

## Code example — selection before confirmation

Assert observable reducer state: confirmation cannot navigate until a valid workout is selected.

From [modes.test.ts](modes.test.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
it('selects without navigation and confirms only a valid selection', () => {
    const menu = { ...INITIAL_STATE, mode: 'MENU' as const };
    expect(appReducer(menu, { type: 'CONFIRM_SELECTION' })).toBe(menu);
    expect(appReducer(menu, { type: 'SELECT_WORKOUT', workoutId: 'invalid' })).toBe(menu);
    const selected = appReducer(menu, { type: 'SELECT_WORKOUT', workoutId: 'bodyweight-squat' });
    expect(selected.mode).toBe('MENU');
    expect(appReducer(selected, { type: 'CONFIRM_SELECTION' }).mode).toBe('CALIBRATION');
})
```
