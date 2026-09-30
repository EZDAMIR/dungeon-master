# Gesture tutorial

Scope: `frontend/src/features/onboarding/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Teach the supported gestures through explicit, observable learning steps.

## Code rules

- tutorialMachine.ts is a pure transition function; GestureTutorial.tsx renders its state and registers the tutorial target.
- Advance only from actual tracking/focus/confirmed-command events; do not skip steps using an elapsed timer.
- Interpret back/confirm as tutorial gestures during learning and require the correct target for pinch.
- Reuse vision configuration for tracking stability; keep landmark classification in vision/gestures.

## Dependencies

Use VisionEvent, named vision timing configuration and gesture-navigation presentation components; do not import app/page runtime.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/app/__tests__/flow.test.ts src/features/gesture-navigation/__tests__/store.test.ts src/app/__tests__/App.test.tsx`; verify restart while already tracked and loss during learning.
