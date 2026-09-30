# Frontend development scripts

Scope: `frontend/scripts/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own reproducible asset preparation and validation of folder instruction coverage.

## Code rules

- prepare-vision-assets.mjs verifies pinned downloads before atomic installation and copies WASM from the installed dependency.
- check-folder-instructions.mjs checks every authored directory from tracked and nonignored untracked paths; generated directories are excluded by git.
- Keep scripts independent of React; use Node built-ins and bounded network operations.
- Tests belong beside these scripts as *.node-test.mjs and use node:test, keeping them outside Vitest's discovery pattern; do not add a test framework for script checks.

## Dependencies

Scripts may read package assets and repository files; never import browser UI or process user camera data.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test:instructions` and `npm run check:instructions`; asset-script changes additionally need cached, failed-checksum and fresh-download checks.
