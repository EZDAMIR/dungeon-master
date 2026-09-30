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
