# Sprint 4A — Demo and manual checklist

Use only synthetic data. Start PostgreSQL/backend with the migration applied, then frontend. Set `APP_ENV=development` or `ENABLE_DEMO_PERSONAS=true`. Open `/?juryDemo=1`. Live AI is optional; fixture demos do not wait for a provider or require an account.

## Verified browser flow on 2026-09-30

Production build was served under `/dungeon-master/`; Chrome used an isolated temporary QA database. The database was created/migrated with `make migrate` and `alembic check`, and is removed after QA. Screenshots are in [screenshots/sprint4a](screenshots/sprint4a/).

- [x] Select Maya; context is prefilled and shows 15 minutes, 2 days, no equipment.
- [x] Open the synthetic source; review short facts, not full document text.
- [x] Confirm facts; confirmation and reject API paths have automated coverage.
- [x] Generate profile/plan; record Low-Impact Return, calf raise and controlled squat, 2 × 6, 90-second recovery, supportive coaching.
- [x] Open why-this-plan and source-linked reasons.
- [x] Open exercise details with instruction, camera placement, joints, movement stages and corrections.
- [x] Verify Swap unavailable is disabled and clearly stated.
- [x] Deny camera; retry, back and guided execution remain available.
- [x] Complete guided execution; result does not claim assessed technique or automatic repetitions.
- [x] Open progress and switch back to context.
- [x] Select Arman; record Strength, dumbbell curl/goblet squat, 4 days, 3 × 12, 45-second rest and energetic tone.
- [x] Select Dana; record Desk Reset, 10-minute standing sessions, KK messages, desk-reset and pre-sleep blocks.
- [x] Compare persona exercise selection, schedule, volume, tempo, rest, messages and routines without entering data.
- [x] Test plan/review/details/camera/manual at 390×844 and 834×1112; no horizontal overflow.

## Interpreter replay and automated evidence

Open development `/?juryDemo=1&fakeVision=1`. Start the selected calf exercise and click camera start, then Stable calibration/countdown twice. Shallow rep shows «Пятки выше»; tracking lost shows one recovery cue; Correct rep then returns an accepted result. Finish early and open progress. These controls replay synthetic landmarks through the existing PoseSession; they do not fabricate repetition events. They are removed from production builds.

- [x] Generated correction and tracking recovery verified with browser screenshots and interpreter tests.
- [x] Two completed attempts, one rejected and one accepted, synchronize to progress with 50% acceptance.
- [x] Invalid spec gets one repair; failed repair becomes manual-only without discarding the whole plan.
- [x] Provider disabled/unavailable gives the deterministic Sprint 3 plan.
- [x] Mocked live AI/RAG stores embeddings, filters owners and generates alternate plan volume/identities.
- [x] Legacy squat, gesture navigation, aggregate sync and cache tests continue to pass.
- [x] No real medical document, real API key or raw camera frame was needed.

## Still requiring a person and hardware

- [ ] Perform actual calf/curl/squat movement in front of a webcam at full-body distance; confirm experimental thresholds and camera placement.
- [ ] Test microphone-free SpeechSynthesis on machines with RU/KK/EN voices; missing voices already have a visual/local-tone fallback.
- [ ] Run with an explicitly supplied live OpenAI key/model to observe provider variability and latency; all automated calls are mocked.
- [ ] Time a human jury walkthrough for the 3–5-minute target and verify distance readability physically.

Screenshot review establishes layout evidence, not measured pose/medical accuracy. See [visual QA deviations](FIGMA_VISUAL_QA.md) and [Sprint 4A report](SPRINT_4A_REPORT.md).
