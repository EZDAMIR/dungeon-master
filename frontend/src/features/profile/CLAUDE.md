# Profile interactions

Scope: `frontend/src/features/profile/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own Sprint 3 gesture-accessible preference steps and explicit confirmation of controlled constraint codes.

## Code rules

- Add code only for an authorized profile capability, with explicit validation and readable loading/error states.
- Treat health constraints as user-confirmed data; do not infer them from camera samples.
- Keep guest/local operation usable when optional sync fails, and avoid logging sensitive profile data.

## Dependencies

Use typed API/store contracts; do not couple profile UI to per-frame vision data.

## Verification

Commands run from `frontend/` unless specified otherwise.
Mock API failure and validate full replacement, explicit user confirmation, local drafts and semantic gesture callbacks.
