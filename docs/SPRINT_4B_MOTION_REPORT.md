# Sprint 4B — A3 motion report

Branch `work/4b-motion`; base `9c0ef5fd26be2b1e608e7cdde2027a66659da4a8`.
Implementation commit: `dd3dc469ceecb71a5a2abead73f341a2f88c5d96`.
Final refinement/document commit SHA is published in the assigned external `_handoff/A3/FINAL.json` after committing this report. No push, main merge, server, workflow, SSH, real environment or deployment changes were made.

## Acceptance criteria completed

Fullscreen ivory introduction with graphite/citron actions, the requested Russian hand-control copy, explicit permission action, mouse fallback, concrete existing camera-error messages, Retry and slow-start recovery. The first-run sequence is INTRO → REQUESTING_CAMERA → WAITING_FOR_HAND → CURSOR_SETUP → TARGET_PRACTICE → COMPLETE. Camera/tracking readiness is never loaded from storage. Live setup separates hand positioning from later full-body calibration. Actual successful hand selections determine calibrated outcome; physical completion remains default/skipped. A pinch completion waits for release; entering the next target scope requires a further 250 ms neutral release.

One scoped gesture registry blocks background targets and application command mapping while the modal is open. The pointer is inside the fullscreen layer. Background is inert, keyboard focus is trapped/restored and Escape selects mouse fallback. Gesture targets arbitrate conventional actions against hand candidates; ordinary mouse movement does not create a hand cursor. Mute/audio/provider implementations remain A2-owned.

Sensitivity is runtime gain over anchored, once-mirrored, normalized fingertip deltas. Temporal filtering uses `alpha = 1-exp(-dt/tau)` separately from gain. Configuration, tracking gaps, hand changes and loss/reacquire forget the physical anchor while retaining the normalized screen location. Fist/thumb-up geometry clutches the pointer. Identical fixture traces produce 50/100/150/200 px for gains .5/1/1.5/2 before clamping. Minimum gain reaches all four viewport corners through clutch/reposition. Tests cover stationary noise bounds, 20/40fps consistency, resize and aspect-correct pinch geometry. These are deterministic properties, not reliability measurements on people.

A single validated preferences store owns `dungeon-master.input-preferences.v1`: version, hands/mouse mode, sensitivity .5..2, smoothing 0..200 ms, completed flag. Defaults are 100% and 80 ms. It rejects malformed/out-of-range values and displays honest memory-only persistence. Large gesture-selectable +/- and 70/100/150% presets work without dragging the native range. Tuning changes neither pose thresholds, model cadence, confidence nor pointer size.

Generic repetitions now emit `workout.generic_rep_completed` with actual unique error codes. A range-rejected cycle with normal duration has tempo ok, not fast. Total duration and sampled cycle visibility are measured; unsupported angles/depth/directional durations are null. Legacy `workout.rep_completed` remains the original typed squat event. The analyzer copies/freezes the declaration for the set; validated interpreter allowlists remain. Sustained tracking loss or camera-angle invalidity requests recalibration; interrupted partial cycles do not count. Legacy squat target is configurable, retaining the default five-rep behavior.

WorkoutSessionRunner executes full exercise/set/rest/next-exercise/results flows from actual plan targets. Quick demo uses the first exercise, one set, five reps and leaves the original plan untouched. Specs and targets are frozen, UUIDs stable, persisted set indices globally 1-based. Rest uses a monotonic deadline; pause freezes rest and hidden-tab commands cancel camera partials. Resume returns through readiness. Set active duration excludes calibration, pauses and rest; elapsed session duration remains separate. Manual completion is explicit and has zero camera accepted/rejected reps, no camera error counts and no fabricated measurements. Early stop retains completed sets and a measured partial set, without duplicating a completed set stopped during paused rest.

WorkoutSessionController reuses the existing RealVisionSource. It switches to body calibration/countdown/workout for sets and hand navigation during rest/exercise transitions. No second stream, inference loop, camera request, speech coordinator or frame-network I/O was added.

## Public contracts and A2 integration

- `frontend/src/features/hands-onboarding/public.ts`: HandsOnboarding, HandsIntroExit, HandsRuntimeAdapter, createHandsRuntimeAdapter.
- `frontend/src/features/input-settings/public.ts`: InputSettings, inputPreferences, useInputPreferences, InputPreferencesStore, parser/defaults/key/types.
- `frontend/src/features/workout-session/public.ts`: WorkoutSessionRunner, WorkoutSessionController, RestView, NextExerciseView and runner/set/event types.

Exact props and events are in the external `_handoff/A3/CONTRACT.md`. App must retain one CameraStage/source lease through setup → voice → plan. The wizard creates no video or camera. Feed the existing live preview into its preview slot without unmounting/remounting the sole camera owner. The runtime adapter wraps the existing GestureStore and a source getter/start/stop callbacks. A2 mounts the feature and routes only trusted physical interactions to its one audio unlock handler. The owner subscribes to preferences for saved-return tuning. Reopening settings during a workout pauses first, switches to hands, then resumes through body readiness.

A2 uses runner snapshots as full-session authority, maps every completed/partial set to A1's aggregate API/queue, handles generic rep events and suppresses the old one-set `workout.completed → RESULTS` shortcut while a runner is active. Visibility events must call controller.setVisible(false, performance.now()); resume requires explicit action. Controller.tick supplies monotonic rest updates. No backend or provider call belongs in those frame callbacks.

## Checks and visual evidence

- Own motion suites cover vision, gesture-navigation, workout, preferences, fullscreen onboarding and workout-session. Final exact pass count is in FINAL.json.
- `npm run lint --prefix frontend`, `npm run type-check --prefix frontend`, `npm run check:instructions --prefix frontend` and `npm run test:instructions --prefix frontend`: pass without changed configuration or gates.
- `npm run build --prefix frontend`: pass. The normal prebuild verified official pinned gesture/pose models from an approved shared PUBLIC cache after direct public downloads hit DNS/timeout; WASM came from this clone's installed MediaPipe package.
- `frontend/node_modules/.bin/vite build frontend --base=/dungeon/`: pass. Existing large-bundle advisory remains; no gate was weakened.
- `python3 scripts/verify_architecture.py`: pass (structure only).
- `git diff --check`: pass.
- Full frontend suite/coverage was run, with reporting on failure. Three A2-owned legacy assertions in `app/__tests__/poseFlow.test.ts` still filter the old rep event for generic calf/curl/squat. A2 explicitly requested leaving their migration to integration. These are recorded failures; the isolated motion suite is not presented as full-app acceptance. No tests/modules or coverage gates were excluded or weakened. Coverage and latest suite counts are recorded in FINAL.json.

Synthetic development preview: from repository root run `frontend/node_modules/.bin/vite frontend --host 127.0.0.1 --port 5174 --strictPort`, open `/src/features/hands-onboarding/preview.html`. Its banner and camera placeholder identify synthetic data. It is not imported by production App and cannot execute production preview mode.

Real isolated headless Chrome screenshots used existing application styles at 360×800, 390×844, 768×1024, 834×1194, 844×390 and 1440×900. Intro/setup/actions/rest have no horizontal overflow, minimum 64 px controls and zero page errors. Mobile heading-grid overflow and preset label wrapping were found and fixed. Artifacts are in external `_handoff/A3/screenshots/` with layout-results.json. Screenshot review is synthetic; no webcam, skeleton accuracy, physical gesture reliability or biomechanics was verified.

## Known limitations and next safe task

Physical camera/device acceptance is MANUAL PENDING; follow [the motion checklist](SPRINT_4B_MOTION_MANUAL_CHECKLIST.md). A2 must perform integrated App camera/preview, generic mapper, voice transition, every-set persistence and full test/coverage checks after merging the ready SHA. Runtime requirements are documented, and the role provides working implementations rather than placeholders. This A3 report does not claim a published/full release.
