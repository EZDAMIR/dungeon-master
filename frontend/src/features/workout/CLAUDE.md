# Workout browser runtime

Scope: `frontend/src/features/workout/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own camera/model integration and presentation for the gesture-to-pose workout experience.

## Code rules

- RealVisionSource owns one CameraManager/video, serial recognizer switching, bounded inference and stale-callback/disposal guards.
- CameraStage composes hand drawing, PoseOverlay and the gesture store; keep this feature-aware component outside shared.
- PoseOverlay/poseRenderer handle mirroring, letterboxing, resize and DPR; render existing features without duplicating technique rules.
- PoseSession and SquatAnalyzer in vision own calibration, counting, pause gates and feedback policy.
- FakePoseSource replays synthetic samples through PoseSession with one monotonic replay clock; controls/debug output are development-only.
- Keep model switches, hidden tabs, late startup and unmount cleanup safe; retain completed metrics on recovery.

## Dependencies

Use camera/recognizer/pose modules, VisionEvent, gesture-navigation presentation and synthetic fixtures for development replay. AppMode is a type-only integration contract.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/features/workout src/features/gesture-navigation/__tests__/overlays.test.tsx src/app/__tests__/poseFlow.test.ts src/app/__tests__/App.test.tsx`; build and verify fake controls are absent in production.

## Code example — dispose the shared camera runtime

This method belongs to RealVisionSource. Invalidate pending callbacks before closing models and tracks, remove document listeners and clear mutable presentation. Keep teardown idempotent across unmount, camera failure and cancelled startup.

From [RealVisionSource.ts](RealVisionSource.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
dispose() {
    if (this.disposed)
        return;
    this.disposed = true;
    this.ready = false;
    this.generation++;
    this.cancelFrame();
    document.removeEventListener('visibilitychange', this.visibility);
    this.engine.reset();
    this.session.reset();
    this.adapter?.close();
    this.adapter = null;
    this.camera.dispose();
    this.raw(null, 0, 0);
    this.poseRaw({ sample: null, activeSide: null, fps: 0, inferenceMs: 0 });
}
```
