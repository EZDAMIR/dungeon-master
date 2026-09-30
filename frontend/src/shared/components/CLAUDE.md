# Reusable UI components

Scope: `frontend/src/shared/components/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Present permission, loading, error and hold-progress states through explicit props.

## Code rules

- CameraPermissionView accepts onStart/loading; CameraErrorView accepts message/onRetry; neither owns camera startup.
- HoldProgress displays caller-supplied 0–1 progress; hold thresholds stay in the visual core.
- Keep buttons semantic, labels accessible and status/error messages readable.
- Do not subscribe to feature stores or embed workout/gesture rules. Feature-aware overlays belong in features.

## Dependencies

Import React or shared helpers as needed; no imports from app/pages/features.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/app/__tests__/App.test.tsx` and type checking; exercise loading, permission failure and retry through the consumer.
