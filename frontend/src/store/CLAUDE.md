# Low-frequency state reservation

Scope: `frontend/src/store/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Reserve durable UI/session state; current app reducer and gesture feature store are sufficient.

## Code rules

- This is a placeholder; add a global store only for state with actual cross-feature consumers.
- Keep profile, selected plan and compact session summaries here when authorized; never store frames, per-frame landmarks or continuous cursor positions.
- Keep feature-local state local and preserve guest operation when optional persistence fails.
- Do not add a state library merely to fill this directory.

## Dependencies

Store code may use contract types and storage helpers; no imports from pages or app runtime.

## Verification

Commands run from `frontend/` unless specified otherwise.
When implemented, test reset, serialization, optional-sync failure and preservation of completed local results.
