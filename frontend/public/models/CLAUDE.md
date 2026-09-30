# Verified vision models

Scope: `frontend/public/models/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Document and deliver the pinned official hand and pose models used by the local runtime.

## Code rules

- README.md records source, SHA-256, purpose and license limits for both task files.
- Change a model version only together with the preparation script, adapter compatibility checks and README.
- Do not commit generated .task/.tmp files or replace a checksum merely to accept an unexpected download.

## Dependencies

scripts/prepare-vision-assets.mjs prepares assets; vision adapters load local BASE_URL paths.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run prepare:vision` and `npm run build`; verify both model checksums and test corrupt-download rejection when preparation changes.
