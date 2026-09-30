# Gesture navigation

Scope: `frontend/src/features/gesture-navigation/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Resolve cursor focus and present gesture commands without moving recognition rules into React.

## Code rules

- gestureTargetRegistry.ts owns DOM target rectangles; GestureTarget supplies accessible registered controls.
- gestureStore.ts publishes semantic HUD/tutorial snapshots; cursor and hand/pose presentation use mutable fields.
- GestureNavigationProvider wires subscription and event forwarding; vision engines emit commands without DOM queries.
- RealGestureSource retains the hand-only adapter entrypoint; RealVisionSource in workout owns the application's shared hand/pose camera.
- Preserve release/cooldown feedback and hand-lost recovery; classifier thresholds remain in vision/gestures.

## Dependencies

Use vision contracts/core configuration, onboarding's pure tutorial machine and workout presentation types. App state imports must remain type-only.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/features/gesture-navigation`; cover target resolution, lost hand, source disposal, mirrored cursor and overlay cleanup.
