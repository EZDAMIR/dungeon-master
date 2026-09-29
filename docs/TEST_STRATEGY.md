# Test Strategy

## 1. Test pyramid

### Pure visual unit tests

Highest priority and fastest feedback.

Test:

- geometry and angle helpers;
- cursor mapping;
- smoothing;
- pinch hysteresis;
- hold, release and cooldown;
- application mode transitions;
- squat state transitions;
- repetition completion;
- error activation and recovery;
- feedback priority and rate limiting.

Use normalized JSON landmark fixtures and a fake monotonic clock.

### Frontend component tests

Use a fake visual event source. Verify that semantic events change focus, route,
count, feedback and result state without a real camera.

### Browser smoke test

One end-to-end flow with fake visual events:

```text
tutorial -> menu -> calibration -> workout -> error -> correction -> results
```

A separate manual checklist covers a real webcam.

### Backend tests

Preserve the current coverage gate. Each domain needs:

- schema tests;
- database model tests;
- controller tests;
- endpoint and permission tests;
- provider adapter tests with mocked HTTP.

## 2. Visual fixture format

Keep fixtures small and provider-neutral:

```json
{
  "version": 1,
  "fps": 20,
  "frames": [
    {
      "at_ms": 0,
      "landmarks": [
        {"x": 0.5, "y": 0.4, "z": 0.0, "visibility": 0.99}
      ]
    }
  ]
}
```

Do not commit identifiable webcam recordings or personal health data.

## 3. Manual camera matrix

Test at minimum:

- bright and dim indoor light;
- plain and moderately busy background;
- laptop webcam;
- phone camera layout;
- left and right hand;
- user near and far;
- temporary occlusion;
- low-performance device where available.

Record observations as thresholds are tuned.

## 4. Failure tests

- camera permission denied;
- camera removed after startup;
- recognizer model fails to load;
- hand disappears during hold;
- body disappears during repetition;
- backend offline;
- plan provider timeout;
- calendar authorization cancelled;
- voice provider unavailable.

The local workout and result must survive all optional-provider failures.


## Sprint 2 automated coverage and manual boundary

All algorithm tests use provider-neutral synthetic poses and a monotonic clock; no camera or real model is needed. Versioned JSON files cover side standing, front view, cropped body, correct/shallow/fast cycles, incomplete extension, mid-rep tracking loss, raised hands and standing jitter. `tests/fixtures/pose/builder.ts` generates readable motions and `generate.ts` regenerates the stored JSON. No personal biometric sequences, photos or video are fixtures.

Checks include finite geometry/degenerate vectors, normalized side score, stable side choice, visibility and margins, EMA/outliers/reset, all sequential calibration gates, full-cycle transitions, duplicates/jitter/partials/timeouts, three error rules/multiple errors and deterministic result aggregation. Session tests pass JSON through smoothing, readiness, calibration and analyzer. Pose pause checks hold/release/cooldown and ignored movement. Feedback priority, readiness stabilization and expiry are pure tests; browser speech is mocked to check cooldown, critical interruption and failure isolation.

Shared-source integration tests replay MENU → selection/confirmation → CALIBRATION → COUNTDOWN → WORKOUT → five total cycles → RESULTS. They cover readiness/countdown cancellation, rejected counts, recovery, pause/resume preservation, repeat reset and menu reset. A rendered App test verifies the same UI/corrections/results. Existing gesture fixtures/tests remain. Camera/model lifecycle tests verify one stream, serial close/initialize, switching back to hand mode, bounded inference, stale callbacks, disposal during startup and tab visibility. Canvas tests check mirror/letterboxing/DPR/cleanup without retaining camera images.

Production checks must include both normal and `/dungeon-master/` builds, preview HTTP responses/checksums for both models and installed WASM, absence of fake controls from the production bundle, and a clean clone with `npm ci` and automatic asset preparation. Check that cached valid assets need no download and a downloaded checksum mismatch fails without installing a file. Backend regression uses existing `make check` / `make test`; product backend code is unchanged.

Real-camera verification is **not performed** here. [Sprint 2 manual acceptance](SPRINT_2_MANUAL_CHECKLIST.md) remains mandatory before accepting real counting reliability or tuning defaults. Mocked model performance does not establish inference speed.
