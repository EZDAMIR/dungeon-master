# Profile feature reservation

Scope: `frontend/src/features/profile/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Reserve user-confirmed profile interactions for Sprint 3; no profile UI is implemented yet.

## Code rules

- Add code only for an authorized profile capability, with explicit validation and readable loading/error states.
- Treat health constraints as user-confirmed data; do not infer them from camera samples.
- Keep guest/local operation usable when optional sync fails, and avoid logging sensitive profile data.

## Dependencies

Use typed API/store contracts when implemented; do not couple profile UI to per-frame vision data.

## Verification

Commands run from `frontend/` unless specified otherwise.
When implemented, mock API failure and validate user confirmation, local operation and cancellation.
