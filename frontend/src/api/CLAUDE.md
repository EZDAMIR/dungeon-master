# Backend client boundary

Scope: `frontend/src/api/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Reserve typed HTTP access for optional durable data; Sprint 3 API implementation has not started.

## Code rules

- Add request/response types and safe error normalization only when a backend capability is authorized.
- Use cancellation and timeouts. Backend failure must leave the local workout and result usable.
- Send only explicit user data and compact session summaries; no images, video or continuous landmarks.
- Do not store secrets in frontend configuration or call APIs from the inference loop.

## Dependencies

API code may use transport helpers and contract types; it must not depend on React components or vision execution.

## Verification

Commands run from `frontend/` unless specified otherwise.
When implemented, mock HTTP success, timeout, cancellation and offline behavior; run type checking and the frontend suite.
