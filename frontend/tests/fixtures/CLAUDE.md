# Landmark fixtures

Scope: `frontend/tests/fixtures/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Store compact, synthetic, provider-neutral landmark sequences for deterministic behavior tests.

## Code rules

- Use versioned JSON with fps and frames containing monotonic at_ms and normalized landmarks.
- Hand fixtures cover pinch/noise/hold/loss; pose fixtures cover calibration, valid/rejected reps, recovery and pause.
- Document changes through readable builder inputs and behavior assertions; do not hand-adjust samples solely to make a failing rule pass.
- Never commit identifiable movement recordings, images or personal health data.

## Dependencies

Use hand/pose sample contracts and pure builders; fixtures must not initialize MediaPipe, camera, React or network clients.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run consuming gesture/pose/squat tests and inspect fixture diffs for expected sequence and timing changes.
