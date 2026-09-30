# Mode-level screens

Scope: `frontend/src/pages/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Compose tutorial, menu, calibration, countdown, workout and results views from application snapshots.

## Code rules

- Keep pages thin: render props, invoke action callbacks and compose feature/shared UI.
- Use existing WorkoutView/result types and vision-provided labels/messages/config; do not implement recognition thresholds or exercise transitions.
- Gesture targets retain stable IDs understood by visionEventMapper; provide semantic HTML and accessible fallback controls.
- Do not start camera/model or backend requests from page rendering.

## Dependencies

Pages may import feature/shared UI, vision presentation/config helpers and type-only app snapshots. Do not import App, runtime routing or another page.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/app/__tests__/App.test.tsx` and type checking; confirm recovery/error feedback and results appear through semantic events.
