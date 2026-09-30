# Calendar feature reservation

Scope: `frontend/src/features/calendar/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Reserve optional calendar interactions for Sprint 4; no calendar integration is implemented yet.

## Code rules

- Add code only when calendar work is authorized and the local workout flow is stable.
- Backend owns OAuth tokens, provider I/O and event persistence. The frontend shows capability and retryable sync status.
- Do not embed provider secrets or let calendar failure block a local workout/result.

## Dependencies

Use the future typed API boundary and safe status contracts; do not call calendar providers from vision or components.

## Verification

Commands run from `frontend/` unless specified otherwise.
When implemented, test unavailable capability, cancelled authorization, failure/retry and preserved local results.
