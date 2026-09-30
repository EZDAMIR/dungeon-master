# Sprint 4A — Personal AI Coach, RAG and Universal Camera Coaching

Branch: `sprint/ai-personalized-coach`  
Starting commit: `40c72ab` (`sprint/core-backend-domains`)  
Implementation commits: `7e8da6a` backend; `8fcad92` browser interpreter and Figma flow. The documentation/QA commit containing this report completes the branch's work. Existing user guide/checker edits and `docs/PROJECT_STRUCTURE.md` were preserved and excluded from Sprint commits; AGENT_PROMPT.md was not changed or added.

## Acceptance criteria completed / files changed

AI context, document extraction/review/confirmation, simple RAG, structured AI profile/plan/spec generation, one repair/manual fallback, deterministic fallback, three synthetic jury personas, generic camera interpretation, aggregate results/progress, Figma-derived tokens/components, source-linked reasons/details, localized cues, optional local voice and responsive variants are implemented. [Definition of Done](SPRINT_4A_DEFINITION_OF_DONE.md) explicitly records unverified hardware and visual-parity criteria.

Backend changes live in `src/ai/openai.py`, versioned prompts, `api/{controllers,models,schemas}/ai_coach.py`, document/demo controllers, the AI endpoints, additive existing domain fields, forward migration and regression tests. Frontend changes extend existing AppMode/backend store/camera/session/overlay/queue contracts, add `vision/exercises/generic`, reusable `features/personalization`, API types, local Figma assets/tokens and tests. README, architecture/domain/API/vision/test/implementation docs and development logs were updated. [Frame map](FIGMA_SPRINT_4A_MAP.md), [visual QA](FIGMA_VISUAL_QA.md), [MovementSpec](MOVEMENT_SPEC_V1.md), [personalization](AI_PERSONALIZATION.md) and [manual checklist](SPRINT_4A_MANUAL_CHECKLIST.md) are included.

## AI personalization

Input sources: self-description, existing fitness profile/preferences, confirmed source facts and previous progress. Upload accepts text-layer PDF/TXT/Markdown; small documents are processed synchronously. Raw files are discarded after extraction. Owned chunks use JSONB embeddings, cosine top-5 retrieval and lexical fallback. Pending/rejected facts are excluded from personalization. Source edits invalidate current AI profile/plan.

AI Profile: structured goals, schedule, equipment, preferences, confirmed constraints, coach persona, strategy, highlights and source references. It appears as “Что тренер учёл” inside context/plan, with no chat UI. Calm/supportive/energetic/strict messages are prepared with the declaration.

| Demo persona | Visible plan differences |
|---|---|
| Maya (replaces beginner) | Low-Impact Return; 2 days / 15 min; calf raise + controlled squat; 2 × 6, 90 s rest; supportive RU; controlled tempo and morning reset |
| Arman (replaces active) | Strength; 4 days / 30 min; dumbbell curl + goblet squat; 3 × 12, 45 s rest; energetic RU; no extra routine blocks |
| Dana (replaces office) | Desk Reset; 3 days / 10 min; standing calf raise; 1 × 5, 60 s rest; concise supportive KK; desk reset/pre-sleep; confirmed no-overhead preference |

The synthetic fixtures load instantly and are labelled honestly. They preserve deterministic demo structure on regeneration. Mocked provider generation produces alternate volume and private identities while retaining constraints.

## AI plan and MovementSpec

Model: selected through `OPENAI_MODEL`/`OPENAI_EMBEDDING_MODEL`; no live model/key was used in verification. The jury uses `synthetic-demo-v1`; AI-off uses the existing deterministic generator. The official pinned SDK uses [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs/) and does not parse freeform Markdown. Prompt versions: user-profile/workout-plan/movement-spec/repair V1.

AI chooses private exercise variants and bounded plan parameters, each with reasons and references. Bounds: 4 days, 4 exercises/day, 1–4 sets, 3–20 reps, 15–180 s rest, user-session limit +10 min, bounded strings. Valid generated coaching is experimental; failures receive one repair and then manual-only while the plan stays usable. Swaps are clearly unavailable.

All 16 requested feature operations and 8 condition operators are implemented. Validation checks strict fields, allowed landmarks/operations, arity/dependencies, finite numbers, stage identity/references/reachability, completion/duration bounds and localized length limits. Generated data contains no executable code. Primary cue 56 Unicode characters/two lines, secondary 120, labels 32, title 48; a measured frontend fallback retains font size.

## Generic camera coaching

Analyzer: GenericAnalyzer in the existing PoseSession/RealVisionSource, using existing smoothing, overlays, VisionEvent and aggregate sync. Required generated joints drive highlights; the generic path avoids hardcoded squat angles. Local camera frames/landmarks never reach AI/backend.

Generated calf raise, bicep curl and squat specs were tested with synthetic landmark sequences through the shared interpreter. Repetitions require a held complete cycle; interrupted partials are cancelled and completed totals retained. Small range triggers concrete correction; a corrected attempt is accepted. Browser replay saved 2 attempts / 1 accepted / 50% to progress. Legacy squat/gesture/calibration/countdown/pause/sync regression tests pass. Manual completion uses a timer and never claims assessed technique.

## Frontend and Figma

Context → documents/fact review → personalized plan → details → camera → results → progress remains one flow. Query-only jury selector adds no generic dashboard. Exact paper/graphite/citron/border/feedback tokens, 10 text styles, reused master patterns and downloaded SVGs retain the existing design language. Desktop/dialog and mobile sheet/stack variants share components. Source-linked rows and manual/timer badges explain actual capabilities. Voice uses local SpeechSynthesis/tones, initially muted, with unavailable-voice visual fallback; no microphone or ElevenLabs.

31 screenshot artifacts include production desktop and 390×844 / 834×1112 planning/camera/manual variants plus separately labelled development interpreter correction/recovery/results. Screenshots were compared visually with Figma. Overflow checks are false at both responsive sizes; browser flows reported no page errors. Known deviations are explicit in the QA table. The existing tablet node is a plan; tablet camera behavior is inferred from desktop/mobile counterparts.

## Automated verification / commands run

| Check | Result |
|---|---|
| Backend `make install`, `make check`, `make test` | passed; **239 tests**, **96.83%** coverage; unchanged 90% gate |
| Migration `make migrate`, `.venv/bin/alembic check` | passed in an isolated temporary QA DB; full populated Sprint 3 upgrade/drift regression passed |
| Frontend `npm ci`, `npm run lint`, `npm run type-check`, `npm run test` | passed; **132 tests** |
| Frontend `npm run test:coverage` | passed; **87.25%** statement/line coverage |
| Frontend ordinary build and `--base=/dungeon-master/` | passed; expected Vite >500 kB bundle warning |
| Frontend instruction checker/tests | passed; 47 authored folders, 3 checker tests; user's existing changes preserved |
| Root `python3 scripts/verify_architecture.py`, `git diff --check` | passed; architecture command checks scaffold, not visual/feature completeness |
| Sensitive/generated artifact review | no real key, medical document, environment/DB dump, node_modules/dist/coverage, executable generated code or AGENT_PROMPT.md staged |

## Manual demo evidence and limits

Production Chrome verified Maya/Arman/Dana prefilled contexts, document review/confirmation, different plan data, reasons/details, camera denial → guided mode → results → progress, mobile/tablet stacking and no horizontal overflow. Development Chrome verified the real interpreter with synthetic landmarks, a concrete correction, tracking recovery and a valid subsequent repetition. All provider tests are mocked; no live API result, actual camera performance, medical accuracy or production readiness is claimed.

Remaining limits: swap unavailable; one demo set per session; rest duration shown without an automatic multi-set rest timer; routine completion is local/manual; no OCR or real medical data; generic analyzers and camera-angle heuristic are experimental; physical full-body readability and a human-timed 3–5-minute walkthrough remain to be checked. Russian/Kazakh display glyphs can fall back from Barlow Condensed to Manrope. Plan rows/details/recovery/progress have documented Figma deviations; not every transient state has a screenshot. No dedicated tablet camera frame exists in the source file.

Next safe task: hardware/live-provider validation of Sprint 4A and the documented visual deviations. Next Sprint: **Sprint 4B — ElevenLabs voice and Google Calendar**. No Sprint 4B work was started.

## Sprint 4A navigation follow-up

Implemented native browser paths for context/documents/review, plans, camera
setup/countdown/workout/pause, results, progress and the existing gesture entry.
Back/Forward and refresh use the existing guarded AppMode reducer; camera
calibration is never restored from history, and result traversal does not
duplicate sync. Planning navigation uses native links with current-page state
and preserves jury/dev query flags. Route parsing honors `/dungeon-master/`.

Verification: **144 frontend tests**, **87.44%** statement/line coverage,
lint/type-check/instruction checks and root/base builds passed. Production
Chrome verified deep links/reloads/history, owned synthetic plan restoration,
document steps, manual abandonment, results/progress and responsive navigation
without page errors. Two additional navigation screenshots are in visual QA.
A deployment host must provide an index.html fallback for refreshed application
paths; actual host configuration remains outside Sprint 4A. Existing hardware
and provider verification limitations above remain.
