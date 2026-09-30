# Application composition

Scope: `frontend/src/app/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own App.tsx, the mode reducer and mapping of VisionEvent into application actions.

## Code rules

- modes.ts is the authority for permitted transitions and UI snapshots; visionEventMapper.ts interprets commands for the active mode.
- App wires providers, pages, the shared camera runtime and audio. Do not calculate landmark geometry, reps or technique errors here.
- Keep camera startup inside the explicit start/retry action, and close owned resources on teardown.
- FakeSource and fakeVisionEnabled are development-only; fake events use the real semantic mapper.
- Keep state updates semantic; per-frame landmarks and cursor coordinates remain outside app state.

## Dependencies

App may compose pages, features, shared components, audio and contract types. The reducer/mapper stay testable without camera or model initialization.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/app` and `npm run type-check`; verify tutorial → menu → calibration → workout → results, pause/recovery and repeat reset.
