# Pose and session tests

Scope: `frontend/src/vision/pose/__tests__/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

pose.test.ts exercises geometry/calibration/readiness/pause/policy; session.test.ts replays JSON; adapter.test.ts mocks MediaPipe.

## Code rules

- Cover stable side/baseline gates, visibility/outliers, countdown cancellation, completed metric preservation, recovery, pause and feedback expiry.
- Use explicit monotonic timestamps and existing Vitest assertions. Keep tests independent of real cameras, model downloads and live providers.
- Test observable outputs and cleanup; retain assertions that reject accidental duplicate commands or reps.
- Restore mocked browser APIs, clocks and globals after each test. Synthetic acceptance does not establish real-camera reliability.

## Dependencies

Tests may import their subject and pure fixture/support contracts across layers; runtime modules must never import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/pose`, then `npm run type-check` and the broader frontend suite.

## Code example — readiness cancels countdown

Replay a synthetic standing baseline, then check that missing tracking, wrong angle and early descent each require calibration.

From [session.test.ts](session.test.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
it('cancels countdown on lost tracking, wrong angle and early descent', () => {
    for (const bad of [null, pose(5000, 178, { front: true }), pose(5000, 130)]) {
        const session = new PoseSession();
        const events = sequence('standing-side').flatMap(s => session.update(s, s.at));
        expect(events.some(e => e.type === 'calibration.completed')).toBe(true);
        session.setStage('countdown');
        expect(session.update(bad, 5000).some(e => e.type === 'calibration.required')).toBe(true);
    }
})
```
