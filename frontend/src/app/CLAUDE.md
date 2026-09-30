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
- Bootstrap backend independently of camera startup. Capture local session IDs at workout start and enqueue aggregate sync after RESULTS, never in the inference callback.
- PROFILE/PLAN/PROGRESS reuse hand navigation and semantic target callbacks; Back returns to MENU without camera reacquisition.

## Dependencies

App may compose pages, features, shared components, audio and contract types. The reducer/mapper stay testable without camera or model initialization.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/app` and `npm run type-check`; verify tutorial → menu → calibration → workout → results, pause/recovery and repeat reset.

## Code example — subscribe and clean up

Subscribe to the existing backend store at the application boundary. Return its detach callback from the effect so listeners and cancellable work have an owner.

From [useBackend.ts](useBackend.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export function useBackend(store: BackendStore) {
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
    useEffect(() => store.attach(), [store]);
    return snapshot;
}
```
