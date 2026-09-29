# Dungeon Master frontend — Sprint 1

Sprint 1 implements browser camera gesture navigation:

`CAMERA_PERMISSION → TUTORIAL → MENU → select Bodyweight Squat → confirm → CALIBRATION`.

CALIBRATION is a placeholder. Pose analysis, repetitions, exercise rules and backend integration are not implemented by this Sprint. The existing later-screen scaffold and workout event types remain for subsequent work.

## Requirements and start

- Node.js 22.12 or newer (verified here with 26.0.0), npm.
- A webcam and current Chrome or Edge with WebAssembly/WebGL support.
- `localhost` or HTTPS; plain HTTP on a LAN address cannot access the camera.
- Internet access on the developer/build host for npm and the first official model download. The deployed build serves all model/WASM assets itself.

```bash
cd frontend
npm ci
npm run dev
```

Click **Включить камеру** and grant the browser's camera permission. This is the initial conventional action. Complete the tutorial with your hand, select a workout by pinch, then hold Thumb Up. Camera access is not requested on page load. Normal semantic buttons remain available as an accessibility fallback, with tutorial skip and navigation controls under **Доступное управление**.

## Checks

```bash
npm run lint
npm run type-check
npm run test
npm run test:coverage
npm run build
```

`type-check` checks both TypeScript project references; the original solution-level `tsc --noEmit` command did not check the application project. Coverage measures `src/` runtime code; generated WASM, test files and type-only contracts are outside its scope. HTML coverage is in `coverage/`.

## Gestures and feedback

| Input | Action |
|---|---|
| Index fingertip (landmark 8) | Mirrored, smoothed virtual cursor |
| Thumb/index pinch | Select the focused target, once per pinch |
| Closed Fist hold | Back; verifies a tutorial step during learning |
| Thumb Up hold | Confirm the selected workout; verifies the final tutorial step |

Cursor ROI is 0.15–0.85 on each axis with smoothing alpha 0.25. Pinch uses tip distance / palm width, enter ratio 0.32, exit 0.45 and three consecutive samples to trigger. Fist/Thumb Up require classification confidence ≥0.65 and a 600 ms hold, followed by a 200 ms neutral release and a 700 ms cooldown. Cursor movement remains active during cooldown. These are starting values in `src/vision/gestures/gestureConfig.ts`; hardware/person-specific tuning still needs real camera verification.

Inference is scheduled by one animation loop, at most once every 55 ms, only on new playable video frames. Hidden tabs stop scheduling and reset candidates. Return to the tab starts one loop. Cursor and hand overlay use refs/canvas rather than App state for each frame. The video is mirrored only in CSS; cursor and landmark overlay each map original X to `1 - x` once. Canvas handles aspect-ratio letterboxing, resize and device pixel ratio.

The HUD shows camera/hand status, recognized category and confidence, candidate/progress, focus, last confirmed command and recovery instructions. Development also shows measured inference FPS/time. Local Web Audio tones accompany semantic commands after activation; missing audio does not interrupt control.

## Fake vision for development

Open `http://localhost:5173/?fakeVision=1`. The controls generate `VisionEvent` and use the same target resolver, tutorial machine, mapper and reducer as the real source. No real camera/model is started in this mode. Production ignores the parameter and removes the fake controls from the bundle.

To replay the tutorial: Camera ready → Hand found → wait at least 350 ms → Move cursor to target → Move cursor to target again → Pinch / select → Fist hold → Thumb Up hold. In MENU: Move cursor to target → Pinch / select → Thumb Up hold. Hand lost, camera errors, clear focus and holds can also be simulated.

## Model and WASM delivery

The exact dependency is `@mediapipe/tasks-vision` **1.0.1**, API checked against installed `vision.d.ts`: `FilesetResolver.forVisionTasks`, `GestureRecognizer.createFromOptions`, `recognizeForVideo`, `close`, `VIDEO`, one hand. The adapter tries GPU initialization, then CPU once if initialization fails; it normalizes results into provider-neutral samples.

`npm run prepare:vision` runs automatically before dev/build. It downloads official float16 Gesture Recognizer version 1 if absent, verifies SHA-256 and copies WASM from the installed package. Model/WASM binaries are generated assets excluded from git, included in `dist/`. Asset paths are in `src/vision/core/config.ts` and use Vite `BASE_URL`. For a subdirectory:

```bash
npm run build -- --base=/dungeon-master/
npm run preview
```

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

Real camera verification was **not performed** in the agent environment. Use [the manual Sprint 1 checklist](../docs/SPRINT_1_MANUAL_CHECKLIST.md) before accepting camera reliability or threshold tuning.
