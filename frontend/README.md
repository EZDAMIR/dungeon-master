# Dungeon Master frontend — Sprint 4A

The Sprint 2 local five-cycle scenario remains available in Sprint 3:

`CAMERA_PERMISSION → TUTORIAL → MENU → CALIBRATION → COUNTDOWN → WORKOUT ↔ PAUSED → RESULTS`.

The stable legacy exercise profile is `bodyweight_squat_side_v1`; Sprint 4A additionally interprets validated MovementSpec declarations with an experimental generic analyzer. During squats the app analyzes a complete cycle and its depth, tempo and return to standing. It gives specific visual and local audio corrections for insufficient depth, too-fast motion and incomplete extension. Counting stops on missing body landmarks or a poor side view; partial repetitions are discarded. Five total cycles finish the demo even when some are rejected. Results appear immediately; Sprint 3 synchronizes bounded aggregate summaries in the background.

## Requirements and start

- Node.js 22.12 or newer (verified here with 26.0.0), npm.
- A webcam and current Chrome or Edge with WebAssembly/WebGL support.
- `localhost` or HTTPS; plain HTTP on a LAN address cannot access the camera.
- Internet access on the developer/build host for npm and the first official model download. The local app serves all model/WASM assets from your own computer.

```bash
cd frontend
npm ci
npm run dev:cloud
```

Open **http://localhost:5173**. `dev:cloud` uses the committed public `.env.cloud`
configuration: `/api/v1` goes through Vite's localhost proxy to
`https://dungeon-master.helpmake-id.live`. Models, WASM, fonts, UI, camera frames,
landmarks and counting stay local; OpenAI and ElevenLabs credentials stay on the VPS.
No local backend or database is required. The server binds loopback and refuses
an occupied port rather than silently changing the browser origin.

For a local production build: `npm run build:cloud`, then `npm run preview:cloud`
and open **http://localhost:4173**. Preview uses the same API proxy. For full local
backend development use `npm run dev` and `.env.example` as before.
`localhost` means the device running the app; opening a laptop's plain HTTP LAN
address on a phone does not grant camera access.

Voice starts muted. Enabling it prepares eight reusable Russian ElevenLabs cues
in the background, with authenticated API requests and a process-local server
cache. Playback makes no network requests. Unavailable or failed clips use browser
speech/tones; generated personalized messages continue to use browser speech.
The voice API also supports English cues. No microphone permission is requested.

The normal entry opens context without requesting a camera. Use `?juryDemo=1` for Maya/Arman/Dana, review sources, generate a plan and open exercise details. In camera setup, click **Включить камеру** and grant the browser's camera permission. This is the initial conventional action. Complete the tutorial with your hand, select a workout by pinch, then hold Thumb Up. Camera access is not requested on page load. Normal semantic buttons remain available as an accessibility fallback, with tutorial skip and navigation controls under **Доступное управление**.

## Checks

```bash
npm run check:instructions
npm run test:instructions
npm run lint
npm run type-check
npm run test
npm run test:coverage
npm run build
```

`type-check` checks both TypeScript project references; the original solution-level `tsc --noEmit` command did not check the application project. Coverage measures `src/` runtime code; generated WASM, test files and type-only contracts are outside its scope. HTML coverage is in `coverage/`.

## Folder guidance

Start with [frontend instructions](CLAUDE.md) and [the agent guide](AGENTS.md), then
read the `CLAUDE.md` in each folder you edit. Guides cover all authored source,
test, script, asset and reserved folders. Generated model/WASM directories,
dependencies and build output inherit their owning source instructions and do not
receive generated guides. `check:instructions` uses tracked and nonignored
untracked file paths to catch missing/empty guides and broken local guide links.

The format follows [1wash-front's folder instructions](https://github.com/Ya-Sabyr/1wash-front/tree/main/src)
and is tailored to Dungeon Master's existing layers. See [source responsibilities](src/CLAUDE.md),
[application composition](src/app/CLAUDE.md), [feature integration](src/features/CLAUDE.md),
[vision processing](src/vision/CLAUDE.md), [shared UI](src/shared/CLAUDE.md),
and [fixture guidance](tests/fixtures/CLAUDE.md). Reserved-folder guides document
future boundaries without implementing later sprints.

## Gestures and feedback

| Input | Action |
|---|---|
| Index fingertip (landmark 8) | Mirrored, smoothed virtual cursor |
| Thumb/index pinch | Select the focused target, once per pinch |
| Closed Fist hold | Back; verifies a tutorial step during learning |
| Thumb Up hold | Confirm the selected workout; verifies the final tutorial step |

Cursor ROI is 0.15–0.85 on each axis with smoothing alpha 0.25. Pinch uses tip distance / palm width, enter ratio 0.32, exit 0.45 and three consecutive samples to trigger. Fist/Thumb Up require classification confidence ≥0.65 and a 600 ms hold, followed by a 200 ms neutral release and a 700 ms cooldown. Cursor movement remains active during cooldown. These are starting values in `src/vision/gestures/gestureConfig.ts`; hardware/person-specific tuning still needs real camera verification.

One shared camera runtime owns the MediaStream/video and serializes model switching: hand in TUTORIAL/MENU/RESULTS/PROFILE/PLAN/PROGRESS, pose in CALIBRATION/COUNTDOWN/WORKOUT/PAUSED. The old recognizer closes and late initialization completes before the next starts; permissions are not requested again. Inference is scheduled by one animation loop, at most once every 55 ms, only on new playable video frames. Hidden tabs stop scheduling and reset candidates. Return to the tab starts one loop. Cursor and hand overlay use refs/canvas rather than App state for each frame. The video is mirrored only in CSS; cursor and hand/pose landmark overlays each map original X to `1 - x` once. Canvas handles aspect-ratio letterboxing, resize and device pixel ratio.

The HUD shows camera/hand status, recognized category and confidence, candidate/progress, focus, last confirmed command and recovery instructions. Development also shows measured inference FPS/time. Local Web Audio tones accompany semantic commands after activation; missing audio does not interrupt control.

## Fake vision for development

Open `http://localhost:5173/?fakeVision=1`. Hand controls preserve the Sprint 1 tutorial/menu flow. FakePoseSource replays synthetic normalized poses through the same smoothing/calibration/analyzer and `VisionEvent → mapper → AppAction` boundary as the real runtime; it never dispatches application actions. No camera/model starts in fake mode. Production ignores the query and removes fake controls/synthetic builders from its bundle.

After entering calibration, **Stable calibration / countdown** completes the stable gates. Press it again to run 3/2/1/START. **Wrong camera angle**, **Body cropped** and **Pose tracking lost** simulate readiness failures. **Correct rep**, **Shallow rep**, **Fast rep**, **Incomplete extension** each replay a full motion. Five cycles finish the demo. **Pose pause / resume** provides standing, hands-up hold and release; use it twice to pause/resume. Fake source timestamps advance a monotonic synthetic clock; a whole sequence is replayed immediately for UI development.

The versioned JSON fixtures under `tests/fixtures/pose/` contain synthetic 33-point normalized landmarks and timestamps, never camera recordings. `builder.ts` keeps test motion definitions readable; `generate.ts` documents regeneration (with the installed `vite-node` runner). Automated component tests cover the full rendered scenario and explicit recovery/corrections.

## Calibration and squat behavior

Calibration selects a sustained visible side, requires head/feet margins and visible joints, checks paired shoulder/hip overlap relative to torso scale, then collects a median standing baseline. Side-view detection is a heuristic. EMA smooths coordinates while visibility stays raw. Active side is fixed for the calibrated workout, including pause and brief occlusion. Sustained tracking loss requires recalibration; previous completed reps remain.

Countdown continues pose inference and requires a stable standing baseline. Any missing body/angle/standing readiness cancels it. The analyzer requires standing → descending → bottom → ascending → standing with hysteresis, direction confirmation and minimum durations. Shallow cycles still count in total. Starting another descent before fully returning closes one rejected previous cycle and waits for stable standing. A partial rep is discarded on pause, timeout or readiness loss.

All three implemented errors (`depth_insufficient`, `too_fast`, `incomplete_extension`) reject a rep. Error counts increment once per code per completed rep. The main feedback priority is readiness → extension → tempo → depth. Speech operates only on semantic events with a 3 s cooldown; Russian browser voice if available, otherwise local Web Audio tones. Visual feedback remains complete without sound, and the mute control cancels pending speech.

Pause/resume uses pose alone: both visible wrists above the nose while standing, held ≥800 ms, followed by ≥250 ms release and ≥1000 ms cooldown. Counting remains off while paused and resumes only after standing synchronization. Accessible buttons also support pause/resume, calibration back, repeat and menu. RESULTS switches back to hand navigation: Thumb Up repeats, Fist returns to menu, pinch selects either target.

Exact defaults, correction messages, error semantics and limitations: [vision pipeline](../docs/VISION_PIPELINE.md). Pose modes show measured inference FPS/ms only in development; no raw pose logs are produced.

## Model and WASM delivery

The exact dependency is `@mediapipe/tasks-vision` **1.0.1**, API checked against installed `vision.d.ts`: `FilesetResolver.forVisionTasks`, `GestureRecognizer.createFromOptions`, `recognizeForVideo`, `close`, `VIDEO`, one hand. Both adapters try GPU initialization, then CPU once if initialization fails. Pose uses the installed `PoseLandmarker.createFromOptions` / `detectForVideo` declarations, VIDEO mode, one pose and no segmentation. Results are copied to provider-neutral samples and provider result resources are closed.

`npm run prepare:vision` runs automatically before dev/build. It downloads official float16 Gesture Recognizer and Pose Landmarker Lite version 1 if absent, verifies SHA-256 and copies WASM from the installed package. Model/WASM binaries are generated assets excluded from git, included in `dist/`. Asset paths are in `src/vision/core/config.ts` and `src/vision/pose/config.ts` and use Vite `BASE_URL`. For a subdirectory:

```bash
npm run build -- --base=/dungeon-master/
npm run preview -- --base=/dungeon-master/
```

Preview must use the same `--base` as its build. Otherwise Vite can return the SPA HTML fallback for a model URL; an HTTP 200 alone does not verify an asset. Verify its content/checksum. A normal root build uses plain `npm run preview`.

See [model source, checksum and license notes](public/models/README.md). The MediaPipe package is Apache-2.0; the linked model card does not explicitly give a separate binary license. No floating CDN URL is used. First preparation fails clearly if download/checksum fails; deployed visitors need no manual asset action.

## Privacy

Video and landmarks are processed locally in the browser. No frames/images/continuous landmarks are uploaded, no camera recordings are created, and no microphone is requested. No backend or external provider participates in the frame loop. Model/WASM downloads transfer assets to the browser, not user video.

## Troubleshooting

| Problem | Recovery |
|---|---|
| Permission denied | Allow camera access in browser site settings, then Retry |
| No camera | Connect/select an available webcam, then Retry |
| Camera busy/unreadable | Close other camera applications; reconnect and Retry |
| Camera stops after startup | Recognition stops, tracks close and a Retry error is shown |
| Model load failed | Check the generated assets/network; restart with Retry; on the build host run `npm run prepare:vision` |
| Insecure origin | Use localhost or HTTPS |
| Gesture unstable/low confidence | Face your palm toward the camera, improve lighting and hold steadily |
| Hand missing | Raise your palm and keep it near the camera's center |
| Pinch outside target | Point at the large card first, then connect thumb and index finger |
| Confirm without selection | Select the card with pinch before holding Thumb Up |
| Command does not repeat | Release both held command gestures for ≥200 ms; wait for cooldown |

Real camera verification was **not performed** in the agent environment. Use [the Sprint 2 manual checklist](../docs/SPRINT_2_MANUAL_CHECKLIST.md) before accepting real counting reliability, GPU/browser compatibility, inference latency or threshold tuning. The Sprint 1 gesture checklist remains relevant. The app provides general fitness feedback, not clinical measurement, injury assessment or a replacement for a trainer/doctor.


## Sprint 3 backend integration

Copy `.env.example` to `.env` if overriding `VITE_API_BASE_URL`; its documented
default is `http://localhost:8000/api/v1`. No frontend secret is required.
Run the backend following [root setup](../README.md), including environment CORS
configuration for the frontend origin. The client uses Bearer auth, a 7-second
AbortController timeout, composed external cancellation and normalized typed
errors. Response request IDs are available for debugging without logging tokens
or profile data.

A singleton `BackendStore` attaches once across React StrictMode mounts. Startup
restores `dungeon-master.auth.v1` through `/auth/me`, creates a guest only if
missing/401, creates a default profile only on 404 and retrieves an active plan
before generating. Default fields: general_fitness, beginner, 3 days/week,
20 minutes, equipment none, browser language/timezone (ru-RU / Asia/Almaty fallback),
no confirmed constraints. A valid existing plan is reused on reload.

Menu offers separate saved-plan and local demonstration actions. PROFILE uses
six gesture-accessible steps for goal, experience, days, duration, equipment and
explicit constraints, plus Save/Back. Save is a full PUT; offline saves remain
local drafts and synchronize after reconnection. PLAN shows weekly items,
«Базовый план» source and rationale, and can regenerate explicitly. No eligible
exercise means a clear profile/constraints message, not a medical recommendation.
PROGRESS shows saved totals, percentage, CSS bars and recent five sessions; cached
values are labelled and empty history is not fabricated. Pinch activates stable
GestureTargets; held Fist returns to MENU through the existing semantic pipeline.
These modes reuse the hand recognizer and never launch pose or request camera
permission again. Semantic HTML buttons provide fallback control.

Workout startup creates client_session_id and started_at locally; planned start
captures plan_id, while demo start uses null. Results renders before synchronization.
`features/results/sessionAggregate.ts` reduces completed repetition metrics once;
network/storage work happens after the RESULTS transition, outside inference.
Sync calls session start, one set and completion, then refreshes Progress.
A dense backend badge and Results retry action explain online/local/pending/saved
states without covering gesture HUD or workout feedback.

`dungeon-master.pending-sessions.v1` stores only UUIDs, timestamps, aggregate set
and summary data and attempt/identity metadata. Maximum **20** unsynced entries;
completed/synced entries are removed. A full queue refuses another entry and keeps
its result visible. Startup, browser online, successful bootstrap and manual retry
are bounded triggers; no polling or frame-loop requests. Each retry repeats the
same three steps safely through backend idempotency. Failure preserves the local
result and queue. Client ownership metadata is never sent as user_id.

Tokens expire after the server-configured lifetime (default 60 minutes). There
is no refresh credential: controlled 401 recovery creates a new guest once,
with no infinite auth loop. Previous-guest queued results/history remain attached
to that guest and cannot be uploaded as the new guest. Clearing storage loses the
stored identity. Blocked/quota-limited localStorage uses memory and displays that
reload persistence is unavailable. These are guest-demo limitations, not full
account/authentication security.

## Sprint 3 feedback and acceptance

Workout corrections use a top-centred dense high-contrast banner, fixed minimum
height, `clamp(1.5rem, 3.5vw, 3.5rem)` text and separate positive/hint/warning/error
styles. Brief corrections remain visible for 3.5 seconds, tracking errors for
2.5 seconds. Skeleton/debug layers stay below it. aria-live and reduced-motion
support are present; speech may be muted without losing visual feedback.

Mocked HTTP tests cover guest/profile/plan bootstrap, expiry recovery, full save,
three-step retry after partial failure, reload queue persistence, capacity,
identity isolation, cached progress and offline immediate Results. Existing
synthetic gesture/pose/camera lifecycle tests continue unchanged in purpose.
See [Sprint 3 manual acceptance](../docs/SPRINT_3_MANUAL_CHECKLIST.md). Real camera,
gesture operation of new screens and readability at 2–4 metres are **not performed**
here. Run the checklist before accepting those hardware/UX criteria.

## Sprint 4A personalization and design

Context/document/fact review, source-linked plan, details sheet, camera shell, results and progress reuse the existing AppMode reducer and backend store. Figma styles are in `src/design-tokens.css`, with local licensed fonts and downloaded SVGs in `public/design`. Exact provenance, counterpart frames and screenshot deviations are in [the map](../docs/FIGMA_SPRINT_4A_MAP.md) and [visual QA](../docs/FIGMA_VISUAL_QA.md).

The existing `RealVisionSource` and `PoseSession` host the generic interpreter; React contains presentation, not movement thresholds. RU/KK/EN messages are generated/validated before coaching. Tracking, repetition and correction areas remain separate. Local SpeechSynthesis starts muted and degrades to visual cues/local sounds when voices are unavailable. No microphone is captured.

Development `?juryDemo=1&fakeVision=1` reuses FakePoseSource to replay synthetic calf/squat landmarks through the same interpreter. Start the fake camera, calibrate/count down, run a shallow attempt, recover tracking and run a correct attempt. Fake controls/debug output are removed in production. An actual webcam, human distance-readability check and live provider run still require manual verification.

The synthetic persona plans are instant fixtures, not a claim of live AI. Swaps are disabled honestly. Manual exercises and separate routine timers do not report automatic technique assessment. Default API is `http://localhost:8000/api/v1`; set `VITE_API_BASE_URL` when serving another local backend. Both ordinary builds and `npm run build -- --base=/dungeon-master/` are verified.

## Sprint 4A URL navigation

Screens use the browser History API with the existing guarded AppMode reducer.
The main navigation uses links, supports opening a new tab, and preserves
`?juryDemo=1` / development `fakeVision=1`. Browser Back/Forward restores context
steps and planning screens without reloading the application.

| URL (relative to Vite BASE_URL) | Screen |
|---|---|
| `/context` | Context intake / query-only jury selector |
| `/context/documents` | Optional document upload and sources |
| `/context/review` | Extracted fact confirmation |
| `/plan` | Personalized or deterministic plan |
| `/camera/setup` | Selected exercise calibration |
| `/camera/countdown` | Readiness countdown |
| `/workout` / `/workout/paused` | Current exercise / pause |
| `/results` | Current in-memory result |
| `/progress` | Persisted progress |
| `/camera/permission`, `/tutorial`, `/menu` | Existing gesture demo entry and navigation |

A refresh/direct link to a workout without a selected exercise goes to `/plan`;
a result without its in-memory session goes to `/progress`. History traversal to
a previously active camera exercise starts fresh calibration and discards partial
counting state. An abandoned manual exercise returns to the plan. Countdown and
pause updates replace the current history entry instead of adding entries on
every automatic transition. No camera access is requested by a planning link.

Vite dev/preview provide SPA fallback. A deployment host must serve `index.html`
for unknown **application** paths (while serving `/api` and real assets normally).
For a `/dungeon-master/` build, `/dungeon-master/plan` must fall back to
`/dungeon-master/index.html`. Static hosts without such fallback will return 404
on refreshed deep links; deployment remains outside Sprint 4A.
