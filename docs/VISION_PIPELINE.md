# Visual AI Pipeline

## 1. Scope

The visual system recognizes hand commands for navigation and body movement for a
side-view squat. It runs in the browser and emits semantic events.

It is not a general action-recognition model and must not be described as
clinical-grade biomechanics.

## 2. Sprint 2 mode-to-model mapping

| Application mode | Active visual capability |
|---|---|
| Tutorial | hand recognizer |
| Menu | hand recognizer and virtual cursor |
| Calibration | pose recognizer |
| Countdown | pose recognizer |
| Workout | pose recognizer; limited pause gesture |
| Paused | pose pause/resume command; no rep counting |
| Results | hand recognizer |

Sprint 2 implements this mapping in one shared camera runtime. A recognizer closes
before the next one starts; the MediaStream and HTMLVideoElement persist. No
permission request repeats at MENU → CALIBRATION or WORKOUT → RESULTS.

Avoid running both full models continuously unless profiling proves it is stable on
target hardware.

## 3. Gesture map

| Input | Semantic command | Confirmation |
|---|---|---|
| Index fingertip movement | cursor move | immediate, smoothed |
| Thumb-index pinch | select focused target | edge-triggered with hysteresis |
| Closed fist | back | stable hold |
| Thumb up | confirm/start | stable hold |
| Open palm swiped up/down | scroll up/down | multi-frame stroke, settle/release and cooldown |
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

Swipe scrolling extends Sprint 1 navigation. `SwipeDetector` tracks the smoothed
center of the wrist and palm bases only for a confident Open_Palm category.
Pointing, pinch and held commands cannot scroll. Defaults require at least three
samples, 0.16 normalized vertical travel in 120–600 ms, at most 0.1 horizontal
drift and no sample jump over 0.14. Gaps over 250 ms cancel partial strokes.
After firing, the palm must settle within 0.025 for 200 ms or release for 200 ms;
a 700 ms cooldown also applies. Hand loss resets the detector.

The engine emits `gesture.swiped { direction: "up" | "down", at }`; it never
queries the DOM. GestureStore consumes this in hand-navigation modes only.
The UI smoothly scrolls 65% of the viewport of the nearest scrollable panel under
the cursor, falling back to the page and stopping at modal boundaries. Up moves
toward the top; down moves toward the bottom. HUD feedback and optional local
tones identify the direction. Stop the palm briefly before another stroke.
Planning and Results retain the shared camera runtime after explicit permission;
direct planning links expose the camera start action without requesting access
automatically. Pose modes disable scrolling. Synthetic tests cover these defaults;
live-camera tuning remains pending the Sprint 1 manual checklist.

## 5. Pose pipeline

```text
pose landmarks
  -> choose the more visible side
  -> body completeness check
  -> camera-orientation check
  -> landmark smoothing
  -> calibrated joint and timing features
  -> exercise movement state machine
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

### `depth_insufficient`

Evidence: the repetition completes without reaching the calibrated depth threshold.

Feedback: “Опустись немного ниже”.

Effect: counts in total, rejected by the demo rule.

### `too_fast`

Evidence: a completed repetition or descending segment is below the configured
minimum duration.

Feedback: “Медленнее опускайся вниз и контролируй движение”.

### `incomplete_extension`

Evidence: a new descent begins before returning to the calibrated standing range.

Feedback: “Заверши подъём и вернись в исходное положение”.

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

## 9. Semantic event contract

`frontend/src/types/vision.ts` is the provider-neutral discriminated union. It preserves all hand/camera commands and adds pose tracking acquired/lost; calibration updated/completed/required; countdown/countdown done; workout state changes, rep completed (with unique error codes and real metrics), technique feedback activated/cleared, positive feedback cleared, pause/resume and completion. `calibration.required` means the runtime requires a fresh baseline; it does not navigate itself.

All events use the source's monotonic `at` clock. Progress is clamped to 0–1. Raw landmarks are only in the source's mutable presentation object, never semantic events or global React state. The app mapper turns events into actions. Conventional UI controls stay in the application layer. FakePoseSource replays the same pure PoseSession and emits the same event contract.

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

Sprint 1 introduced `RealGestureSource` for camera/model startup and a single
visibility-aware animation loop (Sprint 2 replaces ownership with `RealVisionSource`) and bounded inference (55 ms minimum interval, new playable frames only).
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

## 12. Sprint 2 implementation — calibration and squat coaching

Only `bodyweight_squat_side_v1` is implemented. The browser owns all inference and analysis; there are no backend calls, raw-pose storage, video uploads or medical assessments.

### Models and runtime

Exact `@mediapipe/tasks-vision` 1.0.1 declarations were checked locally. `MediaPipePoseLandmarker` uses VIDEO, one pose, no segmentation masks and `detectForVideo(video, timestamp)`. The adapter copies normalized landmark coordinates/visibility and closes each provider result. It tries GPU then CPU once if initialization fails. `pose_landmarker_lite.task` is official float16 version 1 from Google's pinned distribution; checksum and license notes are in `frontend/public/models/README.md`. The team did not train it. Preparation runs automatically before dev/build, verifies both models, reuses correct assets and copies installed WASM. All paths use Vite BASE_URL.

`RealVisionSource` owns one CameraManager/MediaStream/video. Model switches cancel the scheduled inference frame and close the previous adapter. Startup promises are serialized, including late disposal; only the newest generation schedules inference. A callback token rejects stale scheduled callbacks even after a new model becomes ready. Mode changes within pose modes reuse the same pose model. RESULTS/MENU/TUTORIAL use hand recognition. Unmount or camera failure closes models and media tracks. Hidden tabs cancel inference, discard partial cycles, clear presentation, and schedule one loop on return. A stale/nonplayable video triggers tracking recovery.

Inference interval is ≥55 ms (maximum ~18.2 FPS), only new ready video frames. DEV shows measured inference FPS/ms in a local panel; real hardware profiling was **not performed**. No profiling logs are produced in production. Canvas animation, resize/DPR and letterboxing are independent of the app reducer. Video uses CSS mirroring; each overlay maps X to `1 - x` exactly once. Active-side joints are brighter, missing joints are highlighted, knee angle appears at the knee, and the camera frame guide is purely visual.

### Geometry, readiness and baseline

Named indices define nose, shoulders, hips, knees, ankles, heels, foot indices and wrists. Image-space geometry rescales X by video aspect ratio before measuring angles or paired-joint distances. World coordinates are not used to claim calibrated 3D biomechanics. Angle helpers clamp cosine, handle degenerate vectors and return finite values.

Visibility/presence defaults are 0.65 for the active shoulder, hip, knee, ankle and head, plus visible heel **or** foot index. Required points and head/foot bounds need 0.025 viewport margins; nose-to-foot normalized height must be ≥0.45. These produce `body_not_fully_visible`, `move_farther` or `move_closer`. Required-side score is mean visibility of shoulder/hip/knee/ankle/foot; the higher side must win for 400 ms. The provisional selected side stays fixed until recalibration; one noisy visibility frame cannot flip it.

Side score = clamp(1 − mean projected shoulder/hip pair distance / mean torso length). This is a **heuristic side-view check**, not an exact camera angle. Calibration uses a median window of at most 5 scores; enter score ≥0.72. Workout exit score is 0.62, with 3-of-5 bad samples before a visible issue, then ≥400 ms valid recovery. Counting conservatively discards a partial cycle immediately on invalid readiness, before a delayed error card appears. No readiness issue becomes a rep technique error.

Sequential gates: stable side selection (400 ms), full body (400 ms), side view (500 ms), then standing baseline (900 ms). Baseline knee angle ≥160°, normalized shoulder/hip displacement ≤0.025 relative to the anchor. A gap >250 ms resets calibration rather than pretending unavailable samples were stable. The baseline uses medians of finite knee angle, hip angle, torso tilt, body height and side score, bounded to 40 samples. Serializable `squat-calibration-v1` includes these, active side and monotonic createdAt. It exists only in session memory.

EMA alpha = 0.45 per coordinate; current visibility/presence is never averaged. A jump >0.16 normalized image distance at a required major joint rejects the sample and cancels a partial cycle. Low visibility is gated, filters reset on tracking loss, and overlay/features both use smoothed landmarks. Rejection and reset can delay counting during abrupt motion: this needs real-camera tuning.

Countdown is 3 → 2 → 1 → START (350 ms START display), while pose inference continues and counting remains disabled. Losing required body visibility, side view, calibrated standing angle or shoulder/hip stability cancels countdown to CALIBRATION. Early squat shows standing recovery instructions. Sustained pose absence ≥150 ms emits tracking lost; ≥500 ms requires recalibration during workout or pause. Completed reps survive recovery, and a new baseline may choose a different side. Brief loss keeps the original side and requires standing synchronization.

### Cycle and rule defaults

States: `not_ready`, `standing`, `descending`, `bottom`, `ascending`. Standing resynchronization requires 400 ms with knee angular velocity under 8°/s. Enter standing at calibrated knee angle −10°, leave standing below calibrated angle −18°. Descent needs knee velocity <−8°/s and hip movement down >0.015 body scales/s, sustained ≥100 ms. Minimum state duration is 100 ms. Bottom uses knee ≤112° or a confirmed turnaround after ≥28° excursion; the turnaround rises ≥4° above the minimum. Ascent needs positive knee velocity and upward hip movement, similarly sustained. A complete return to standing confirms one rep. No single crossing counts.

A cycle times out at 10,000 ms, discards its partial metrics and waits for standing. Holding the bottom cannot duplicate reps. Metrics measure minimum knee angle, maximum return angle, observed descent/ascent/total time, normalized depth score, mean visibility and slow/ok/fast tempo. Timings start at the first qualifying descent sample and end at confirmed return/reversal; they are detector timing proxies, not instrumented physical timestamps.

| Implemented error | Rule | Exact visual correction |
|---|---|---|
| `depth_insufficient` | Completed cycle minimum knee >112° | Опустись немного ниже |
| `too_fast` | Observed descent <450 ms OR total <1000 ms | Медленнее опускайся вниз и контролируй движение |
| `incomplete_extension` | Confirmed new descent during ascent before calibrated standing range | Заверши подъём и вернись в исходное положение |

All three reject a rep. An incomplete-extension reversal closes **one previous rejected cycle** and re-synchronizes only at stable standing; the intervening new descent is not counted again. Total includes accepted/rejected cycles and finishes at exactly 5. Error codes are unique per rep, but multiple errors can occur in the same rep. No tracking loss creates a completed rep. No back-rounding, knee-over-toe, spine, asymmetry, injury or safe/unsafe rules are implemented.

### Feedback, pause and results

One main card: readiness > incomplete extension > too fast > depth. Technique feedback expires after 3500 ms or readiness loss; positive feedback expires after 1500 ms. Speech only on semantic events, ≥3000 ms ordinary cooldown; critical tracking loss can cancel old speech and completion always announces the end. Short audio phrases: «Начали», «Хорошее повторение», «Опустись немного ниже», «Медленнее вниз», «Заверши подъём», «Вернись в кадр», «Тренировка завершена». A ru-RU browser voice is preferred; local tone when unavailable. Audio exceptions do not interrupt analysis. No microphone permission is requested.

Pose-only pause/resume: both visible wrists above visible nose, stable standing (workout analyzer already standing), ≥800 ms hold, ≥250 ms release, ≥1000 ms cooldown. A continued hold cannot resume. Pause discards a partial rep, retains completed metrics, keeps pose tracking and disables counting. Resume waits for stable standing. Accessible controls are fallback actions through the same mapper.

RESULTS shows total, accepted, rejected, accepted/total percentage, unique-per-rep counts of each error, mean detector rep duration and one deterministic recommendation. Duration includes elapsed time from the analyzer's first workout sample, including pauses/recovery. No raw samples are retained in results. Thumb Up/pinch repeats with a fresh analyzer; Fist/pinch returns to menu. Returning to either hand mode closes pose recognition without requesting camera permission again.

### Readiness corrections

- Missing joints: «Отойди немного назад: плечи, колени и стопы должны быть видны».
- Cropped body/head/feet: «Отойди немного назад, чтобы стопы полностью попали в кадр».
- Too small: «Подойди немного ближе к камере».
- Wrong side view: «Повернись боком к камере».
- Standing stability: «Стой спокойно в исходном положении».
- Tracking lost: «Вернись в кадр и займи исходное положение».

### Limits and manual status

Synthetic tests establish deterministic behavior, not real inference quality. One side webcam, 2D geometry, clothing, lighting, occlusion, atypical camera placement, model noise and image projection can affect results. Defaults above have **not** been tuned with live camera testers. Real browser/GPU performance and reliability acceptance are pending `SPRINT_2_MANUAL_CHECKLIST.md`. No clinical accuracy, injury prevention, diagnosis, additional exercises, server persistence or GPT personalization is claimed.

## Sprint 4A generic coaching

`analyzerFactory` preserves the legacy stable squat and chooses GenericAnalyzer for validated other declarations. The same camera stream, adapters, smoothing, PoseSession, overlay, VisionEvent and sync contracts remain. `featureEvaluator`, `conditionEvaluator` and `phaseMachine` execute only finite allowlisted data; no generated JavaScript, eval or executable expressions exist. Generated required joints drive overlay highlights; generic coaching does not display a hardcoded squat angle.

Calibration locks a stable side/baseline, held transitions count a complete movement cycle, and rep/frame rules produce one primary correction. Tracking loss and pauses cancel partials, retaining completed counts. Localized messages obey limits/fallback and never call a translator during exercise. Invalid specs route to manual timers/completion. FakePoseSource reuses the same PoseSession with synthetic landmarks in development; live webcam thresholds remain experimental. Read [MovementSpec](MOVEMENT_SPEC_V1.md) and [manual evidence](SPRINT_4A_MANUAL_CHECKLIST.md).
