# User-facing features

Scope: `frontend/src/features/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own interaction UI, semantic state and browser runtime integration for the local fitness flow.

## Code rules

- gesture-navigation owns target registration, gesture HUD/state and cursor presentation; onboarding owns tutorial progression.
- workout owns camera/model lifecycle, overlays and fake pose replay; pure gesture/pose/exercise analysis stays in vision.
- Profile owns gesture preference steps; results owns aggregate sync projection. Calendar remains reserved for a later authorized sprint.
- Keep conventional accessible controls alongside gesture controls. Use semantic events rather than DOM .click().
- Keep current flat feature modules; add ui/model/lib subdivisions only when they clarify real implemented code.

## Dependencies

Features may use vision, types, shared, audio and explicit peer contracts. Current onboarding/gesture/workout integration and type-only app state imports are intentional; do not import app/page runtime code.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/features` and type checking; mock camera/model boundaries and verify cleanup, failure states and semantic interaction.
