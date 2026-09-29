# Visual AI Pipeline

## 1. Scope

The visual system recognizes hand commands for navigation and body movement for a
side-view squat. It runs in the browser and emits semantic events.

It is not a general action-recognition model and must not be described as
clinical-grade biomechanics.

## 2. Planned mode-to-model mapping

| Application mode | Active visual capability |
|---|---|
| Tutorial | hand recognizer |
| Menu | hand recognizer and virtual cursor |
| Calibration | pose recognizer |
| Countdown | pose recognizer |
| Workout | pose recognizer; limited pause gesture |
| Paused | hand or pose pause/resume command |
| Results | hand recognizer |

Sprint 1 implements the hand recognizer in tutorial/menu and keeps it active in
the CALIBRATION placeholder so fist can return to MENU. Pose and workout entries
in this table are planned for later Sprints and are not implemented yet.

Avoid running both full models continuously unless profiling proves it is stable on
target hardware.

## 3. Gesture map

| Input | Semantic command | Confirmation |
|---|---|---|
| Index fingertip movement | cursor move | immediate, smoothed |
| Thumb-index pinch | select focused target | edge-triggered with hysteresis |
| Closed fist | back | stable hold |
| Thumb up | confirm/start | stable hold |
| Raised hand in workout | pause/resume | stable hold and workout-only |

At least the pinch, fist and thumb-up commands must be robust before extra gestures
are added.

## 4. Hand pipeline

```text
hand landmarks
  -> handedness/mirror normalization
  -> visibility/confidence gate
  -> fingertip position smoothing
  -> camera-space to viewport-space mapping
  -> focus resolver
  -> pinch ratio and built-in gesture categories
  -> temporal hold/cooldown state
  -> semantic command
```

Pinch ratio uses thumb-tip to index-tip distance normalized by a stable palm
measurement. Use different enter and exit thresholds to prevent flicker.

Do not call DOM `.click()` from the low-level engine. Emit a semantic select event
with the currently focused target ID.

## 5. Pose pipeline

```text
pose landmarks
  -> choose the more visible side
  -> body completeness check
  -> camera-orientation check
  -> landmark smoothing
  -> calibrated joint and timing features
  -> exercise phase machine
  -> repetition and error events
```

Calibration stores user-relative working values rather than assuming one universal
joint angle.

## 6. Squat state machine

```text
STANDING
  -> DESCENDING
  -> BOTTOM
  -> ASCENDING
  -> STANDING: repetition completed
```

A repetition is accepted only after a complete state cycle. Short transient angle
changes must not count.

Suggested first metrics:

- minimum calibrated depth;
- total repetition duration;
- descending duration;
- return to calibrated standing range;
- body visibility;
- camera orientation.

## 7. Concrete error codes

### `body_not_fully_visible`

Evidence: required landmarks remain below visibility threshold.

Feedback: “Отойди немного назад: плечи, колени и стопы должны быть видны.”

Effect: pause repetition analysis until recovered.

### `wrong_camera_angle`

Evidence: side-view assumptions are not met for a stable sample window.

Feedback: “Повернись боком к камере.”

Effect: pause repetition analysis.

### `insufficient_depth`

Evidence: the repetition completes without reaching the calibrated depth threshold.

Feedback: “В следующем повторении опустись немного ниже в доступном диапазоне.”

Effect: repetition may count as completed but not accepted.

### `too_fast`

Evidence: a completed repetition or descending phase is below the configured
minimum duration.

Feedback: “Опускайся медленнее и контролируй движение.”

### `incomplete_extension`

Evidence: a new descent begins before returning to the calibrated standing range.

Feedback: “Заверши подъём и выпрямись до своего исходного положения.”

These messages describe visible behavior and do not diagnose injury or risk.

## 8. Temporal policy

Starting design, to be tuned through tests:

- inference frequency: bounded and device-aware;
- cursor smoothing: exponential or One Euro filter;
- static command hold: approximately 0.5–0.8 seconds;
- command cooldown: approximately 0.5–0.8 seconds;
- error activation: condition present in N of the latest M samples;
- repeated voice feedback: independent multi-second cooldown;
- command re-arm: gesture must be released first.

Keep all values in named configuration, not scattered literals.

## 9. Semantic event sketch

```ts
type VisionEvent =
  | { type: 'camera.ready'; at: number }
  | { type: 'camera.denied'; at: number; reason: string }
  | { type: 'tracking.lost'; at: number; target: 'hand' | 'body' }
  | { type: 'cursor.moved'; at: number; x: number; y: number }
  | {
      type: 'gesture.confirmed';
      at: number;
      command: 'select' | 'back' | 'confirm' | 'pause';
      targetId?: string;
    }
  | {
      type: 'workout.rep_completed';
      at: number;
      repIndex: number;
      accepted: boolean;
      metrics: RepMetrics;
    }
  | {
      type: 'workout.technique_error';
      at: number;
      code: TechniqueErrorCode;
      correction: string;
      severity: 'hint' | 'warning';
    };
```

## 10. Test fixtures

Store normalized landmark sequences as small JSON fixtures:

- steady pointing hand;
- pinch enter/hold/release;
- noisy pinch near threshold;
- fist hold and early release;
- thumb-up hold;
- hand lost and recovered;
- correct squat;
- shallow squat;
- fast squat;
- incomplete extension;
- partial body visibility.

Unit tests should be deterministic and use a fake monotonic clock.

## 11. Sprint 1 implementation

`RealGestureSource` owns camera/model startup, a single visibility-aware animation
loop and bounded inference (55 ms minimum interval, new playable frames only).
`CameraManager` requests video only after the start button, waits for `play`,
handles permission/device errors and closes all tracks/listeners. The adapter
normalizes MediaPipe 1.0.1 results and tries GPU then CPU once during initialization.
All model/WASM assets are self-hosted with Vite BASE_URL; see frontend/model README.

The deterministic engine maps landmark 8 through mirrored ROI and exponential
smoothing; pinch uses landmarks 4/8 normalized by 5/17 with hysteresis and three
consecutive entry samples. Fist/Thumb Up use one hold gate: 600 ms hold, 200 ms
neutral release and 700 ms cooldown. Loss resets the gates, focus and cursor.
Release and cooldown do not suppress cursor events.

The React target registry resolves registered button rectangles and enriches a
select event with its focused ID. Visual core modules never query DOM targets or
click elements. A feature-specific external store publishes semantic HUD/tutorial
state, while cursor position and raw landmarks stay outside App state. Canvas and
cursor animate from mutable references. Video is CSS-mirrored; the cursor and
canvas map original X with `1 - x` independently, once each.

`FakeSource` is explicit development-only `?fakeVision=1` and emits VisionEvent.
Both sources pass through the same target registry, tutorial machine,
`visionEventMapper` and pure app reducer. Pinch selects Bodyweight Squat in MENU;
Thumb Up requires that selection to enter CALIBRATION. Tutorial interprets fist
and Thumb Up as learning steps rather than normal navigation. Conventional buttons
are accessible fallbacks. Optional Web Audio tones run only on semantic commands.

Tracking stability needs 350 ms of continued cursor samples; no timer skips an
unperformed tutorial gesture. Returning from MENU restarts tutorial tracking even
when the recognizer already sees the hand. Camera errors stop the source and expose
Retry. Hiding the document cancels the scheduled frame and resets tracking;
returning schedules a single frame. Pending camera/model promises check disposal
and release late resources.

Pure fixture, camera-mock, adapter-mock, source lifecycle and rendered React tests
cover the Sprint 1 scenario. These do not replace live-camera acceptance; see
`SPRINT_1_MANUAL_CHECKLIST.md` for the pending check.
