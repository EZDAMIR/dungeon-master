# Low-frequency backend state

Scope: `frontend/src/store/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own the Sprint 3 singleton backend bootstrap, profile/plan/progress snapshots and bounded aggregate sync queue; preserve the app reducer and gesture feature store.

## Code rules

- Use the existing external-store subscription and single-flight bootstrap/sync; do not add a state library.
- Keep profile, selected plan and compact session summaries here when authorized; never store frames, per-frame landmarks or continuous cursor positions.
- Keep feature-local state local and preserve guest operation when optional persistence fails.
- Do not add a state library merely to fill this directory.

## Dependencies

Store code may use contract types and storage helpers; no imports from pages or app runtime.

## Verification

Commands run from `frontend/` unless specified otherwise.
Test guest recovery/ownership, serialization, 20-entry capacity, bounded retry, storage failure and preservation of completed local results.
