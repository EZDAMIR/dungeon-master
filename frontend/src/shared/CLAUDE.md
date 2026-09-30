# Reusable presentation

Scope: `frontend/src/shared/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own reusable browser UI and utilities that do not depend on feature state.

## Code rules

- components contains callback-driven permission/error views and HoldProgress.
- Keep feature-aware camera composition in features/workout/CameraStage.tsx.
- Add shared helpers only when unrelated consumers need them; keep technique policy and user workflows in their owning modules.
- Do not put backend mutations, recognition lifecycle or global state ownership here.

## Dependencies

Shared runtime code may import React, local shared helpers and generic contract types; it must not import app, pages or features.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run type checking and the rendered App/overlay tests; verify new UI through consumer behavior and failure/accessibility states.

## Code example — callback-driven recovery UI

Present a readable error and semantic retry button. The caller owns camera startup and the retry action; reusable presentation does not import a feature store.

From [CameraErrorView.tsx](components/CameraErrorView.tsx). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```tsx
export function CameraErrorView({ message, onRetry }: {
    message: string;
    onRetry: () => void;
}) {
    return <section className="camera-error"><p role="alert">{message}</p><button type="button" className="primary-action" onClick={onRetry}>Повторить / Retry</button></section>;
}
```
