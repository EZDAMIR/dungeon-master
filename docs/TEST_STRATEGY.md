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
- squat phase transitions;
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
