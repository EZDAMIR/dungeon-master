# Application routing

Scope: `frontend/src/app/router/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Reserve routing configuration while modes.ts currently determines the visible screen.

## Code rules

- This is a placeholder; do not install a router just to populate this directory.
- If routing becomes necessary, render pages and keep the mode reducer's recognizer and transition gates intact.
- Route changes must not restart the camera permission flow or permit counting before calibration/countdown.

## Dependencies

Routing may compose pages and app setup; pages/features must not import runtime routing configuration.

## Verification

Commands run from `frontend/` unless specified otherwise.
When implemented, test navigation, invalid transitions and camera lifetime; run the app flow tests.
