# Application provider composition

Scope: `frontend/src/app/providers/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Reserve app-wide provider wiring; current gesture provider is implemented in its feature.

## Code rules

- This is a placeholder; create provider code only for an authorized global dependency.
- Compose providers once at the app boundary and keep feature behavior in features.
- Do not trigger network mutations, camera permissions or exercise analysis during provider setup.

## Dependencies

Provider composition may import existing feature providers; lower layers must not import runtime provider setup from app.

## Verification

Commands run from `frontend/` unless specified otherwise.
When implemented, test mount/unmount cleanup and render App through the provider; run type checking.
