# Gesture navigation

Scope: `frontend/src/features/gesture-navigation/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Resolve cursor focus and present gesture commands without moving recognition rules into React.

## Code rules

- gestureTargetRegistry.ts owns DOM target rectangles; GestureTarget supplies accessible registered controls.
- gestureStore.ts publishes semantic HUD/tutorial snapshots; cursor and hand/pose presentation use mutable fields.
- GestureNavigationProvider wires subscription and event forwarding; vision engines emit commands without DOM queries.
- RealGestureSource retains the hand-only adapter entrypoint; RealVisionSource in workout owns the application's shared hand/pose camera.
- Preserve release/cooldown feedback and hand-lost recovery; classifier thresholds remain in vision/gestures.

## Dependencies

Use vision contracts/core configuration, onboarding's pure tutorial machine and workout presentation types. App state imports must remain type-only.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/features/gesture-navigation`; cover target resolution, lost hand, source disposal, mirrored cursor and overlay cleanup.

## Code example — register a real button

Return target cleanup from useEffect, preserve disabled and aria-pressed semantics, and use the same onSelect callback for conventional and gesture controls.

From [GestureTarget.tsx](GestureTarget.tsx). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```tsx
export function GestureTarget({ id, selected = false, disabled = false, onSelect, children }: {
    id: string;
    selected?: boolean;
    disabled?: boolean;
    onSelect?: () => void;
    children: ReactNode;
}) {
    const ref = useRef<HTMLButtonElement>(null);
    const store = useGestureStore();
    const snapshot = useGestureSnapshot();
    useEffect(() => ref.current ? store.registry.register(id, ref.current, onSelect) : undefined, [id, store, onSelect]);
    const focused = snapshot.focused === id;
    const confirmed = selected && snapshot.lastCommand === 'confirm';
    const candidate = focused && snapshot.candidate === 'select' ? 'pinch-candidate' : selected && snapshot.candidate === 'confirm' ? 'confirm-candidate' : '';
    return <button ref={ref} type="button" disabled={disabled} data-gesture-target={id} aria-pressed={selected} onClick={onSelect} className={`gesture-target ${focused ? 'focused' : ''} ${selected ? 'selected' : ''} ${confirmed ? 'confirmed' : ''} ${candidate}`}>{children}</button>;
}
```
