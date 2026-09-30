# User-facing features

Scope: `frontend/src/features/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own interaction UI, semantic state and browser runtime integration for the local fitness flow.

## Code rules

- gesture-navigation owns target registration, gesture HUD/state and cursor presentation; onboarding owns tutorial progression.
- workout owns camera/model lifecycle, overlays and fake pose replay; pure gesture/pose/exercise analysis stays in vision.
- Profile owns gesture preference steps; results owns aggregate sync projection. Calendar remains reserved for a later authorized sprint.
- Keep conventional accessible controls alongside gesture controls. Use semantic events rather than DOM .click().
- Keep current flat feature modules; add ui/model/lib subdivisions only when they clarify real implemented code.

## Dependencies

Features may use vision, types, shared, audio and explicit peer contracts. Current onboarding/gesture/workout integration and type-only app state imports are intentional; do not import app/page runtime code.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/features` and type checking; mock camera/model boundaries and verify cleanup, failure states and semantic interaction.

## Code example — accessible semantic selection

Register a stable target and return the unregister callback. Pointer and gesture selection share the caller’s action; gesture thresholds remain in vision.

From [GestureTarget.tsx](gesture-navigation/GestureTarget.tsx). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

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
