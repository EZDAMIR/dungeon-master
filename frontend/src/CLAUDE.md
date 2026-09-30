# Frontend source layers

Scope: `frontend/src/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Keep browser orchestration, feature presentation and deterministic vision analysis in separate layers.

## Code rules

- main.tsx mounts app/App.tsx and imports index.css. Keep bootstrap free of camera permission requests.
- app composes pages/features; pages compose UI; features integrate semantic events; vision owns recognition and exercise rules.
- types defines shared event contracts; audio handles playback; shared contains reusable presentation without feature imports.
- Keep direct, explicit imports and existing flat modules. Add nested modules or public export files only when an implemented capability benefits.
- Read each descendant CLAUDE.md before editing that folder; do not add empty code layers.

## Dependencies

Vision processing modules must not import React, app, pages or features. Current type-only AppMode/AppState/WorkoutView imports are allowed at UI/runtime boundaries; do not introduce lower-layer runtime imports from app.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run checks from frontend: `npm run check:instructions`, `npm run test:instructions`, `npm run lint`, `npm run type-check`, `npm run test`, and `npm run build`.

## Code example — minimal bootstrap

Mount the application with its existing root setup. Camera permission remains an explicit user action.

From [main.tsx](main.tsx). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```tsx
createRoot(document.getElementById('root')!).render(<StrictMode>
    <App />
  </StrictMode>);
```
