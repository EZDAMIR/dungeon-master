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

## Code example — advance from performed gestures

Tracking samples establish stability; focused selection and confirmed commands advance the tutorial. Hand loss clears the tracking gate instead of advancing via a timeout.

From [tutorialMachine.ts](tutorialMachine.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export function tutorialTransition(state: TutorialState, event: VisionEvent): TutorialState {
    if (event.type === 'tracking.lost' && event.target === 'hand')
        return { ...state, handSince: null, handFound: false };
    if (event.type === 'tracking.acquired')
        return { ...state, handSince: event.at, handFound: true };
    if (state.step === 0 && state.handSince !== null && event.type === 'cursor.moved' && event.at - state.handSince >= visionConfig.handStableMs)
        return { ...state, step: 1 };
    if (state.step === 1 && event.type === 'focus.changed' && event.targetId === tutorialTargetId)
        return { ...state, step: 2 };
    if (event.type !== 'gesture.confirmed')
        return state;
    if ((state.step === 2 && event.command === 'select' && event.targetId === tutorialTargetId) ||
        (state.step === 3 && event.command === 'back') || (state.step === 4 && event.command === 'confirm'))
        return { ...state, step: state.step + 1 };
    return state;
}
```
