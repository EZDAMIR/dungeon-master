# Sprint 4A — Figma implementation map

Source: [Dungeon Master — Motion Studio](https://www.figma.com/design/vFIK97vQDk4xasLgDUdVdN?node-id=6-635). Read on 2026-09-30 using the Figma design-to-code skill. Existing prototype reactions, desktop/mobile counterparts, 27 component masters and 10 text styles were inspected; no Figma nodes were changed. [Handoff snapshot](FIGMA_HANDOFF_SPRINT_4A.json) records styles, masters and prototype links. Exact variables/text styles are in `frontend/src/design-tokens.css`; brand and illustrative pose SVGs are downloaded Figma assets. Local font files include their OFL licences.

AppMode is the existing reducer state, not a new route/page per Figma state. Context/document steps and plan/detail states are reusable variants. All backend data is authenticated and owner-filtered. Query `?juryDemo=1` exposes the jury shortcut; `fakeVision=1` remains development-only.

| Figma frame/node | Screen/state | Route/AppMode | Code component | Data source | Desktop/mobile |
|---|---|---|---|---|---|
| 3:112 | Maya / Arman / Dana switcher | `?juryDemo=1`, PROFILE | ContextFlow / persona cards | guarded synthetic persona endpoint | desktop; responsive stack |
| 3:113, 3:114 | context, goals, schedule, preferences | PROFILE / intake | ContextFlow, existing ProfileSettings | AI context + existing fitness profile | desktop; mobile stacked variant |
| 3:115 | document empty/selected/extracted | PROFILE / documents | DocumentCard variant inside ContextFlow | documents list/upload | desktop; mobile stack |
| 3:116 | upload / extraction loading | PROFILE / busy | shared status variant | synchronous upload promise | desktop/mobile |
| 3:117 | extracted fact review / confirmed / rejected | PROFILE / review | fact cards, FlowAction confirmation | facts + decision endpoint | desktop/mobile stack |
| 3:118, 3:146 | unreadable / extraction failed / offline | PROFILE / document recovery | document failure + RecoveryPanel | sanitized document/API status | desktop/mobile |
| 3:148, 3:149 | delete confirmation / source removed | PROFILE / documents | deletion variants | DELETE document; invalidated AI plan/profile | desktop/mobile |
| 3:119 | building profile/plan | PROFILE / busy | shared status variant | generation promise | desktop/mobile |
| 3:145, 3:160 | editorial AI profile / sources | PROFILE review; PLAN why | AIProfileSummary / SourceChip | structured AI profile + confirmed facts | desktop / mobile sources |
| 3:120, 3:121, 3:122 | Maya / Arman / Dana plan | PLAN | PlanExperience / plan-day and exercise rows | saved AI metadata | desktop; 3:155 mobile, 3:161 tablet |
| 3:123 | why-this-plan / excluded exercises | PLAN / why | disclosure + AIProfileSummary | plan reasons/source references | desktop/mobile |
| 3:103 master; 3:120 | validated / experimental / manual badges and rows | PLAN | exercise row / CameraCoachingBadge | item coaching mode and source | desktop/mobile |
| 3:124 | exercise instructions, joints, stages, corrections | PLAN / details | shared ExerciseDetail panel/dialog | owner-filtered spec + plan item | desktop dialog; mobile bottom sheet |
| 3:125 | swap alternative | PLAN / details | disabled Swap control | `swap_available=false` | unavailable is stated honestly |
| 44:1223 master | morning / desk-reset / pre-sleep routines | PLAN | RoutineCard | returned `routine_blocks` only | desktop/mobile; timer/manual |
| 3:126, 3:156 | camera setup | CALIBRATION / permission | existing CameraExperience / CameraPermissionView | selected spec + local camera | desktop/mobile |
| 3:127 | camera denied / unavailable | CALIBRATION / error | CameraErrorView, guided/back/retry | local camera state | desktop/mobile recovery |
| 3:128–3:130 | legacy gesture tutorial | TUTORIAL | existing TutorialPage / gesture targets | existing GestureEngine | desktop; existing accessible controls |
| 3:131–3:133 | calibration / ready / countdown | CALIBRATION / COUNTDOWN | shared CameraCoachShell | PoseSession / generic calibration events | desktop/mobile |
| 3:134, 3:157 | live tracking / repetitions | WORKOUT | CameraCoachShell, RepCounter, TrackingStatus | GenericAnalyzer or legacy SquatAnalyzer | desktop/mobile |
| 3:135, 3:158 | one technique correction | WORKOUT / correction | DistanceCue + secondary copy | validated spec rule / generic event | desktop/mobile |
| 3:136, 26:1114 | corrected / positive feedback | WORKOUT / accepted rep | same shell positive variant | accepted repetition event | desktop/mobile |
| 3:137 | tracking lost / wrong angle / outside frame | WORKOUT / recovery | same shell readiness variant | local landmark visibility/angle heuristic | desktop/mobile |
| 3:138, 22:1082 | paused | PAUSED | same shell | existing reducer + partial cancellation | desktop/mobile |
| 3:139 | recovery / rest instruction | WORKOUT / after attempt | shared secondary/rest copy | item rest_seconds | rest countdown not implemented |
| 3:140, 22:1083 | manual-only / invalid MovementSpec | WORKOUT / manual | same shell + guided preview/timer | validated mode; manual completion | desktop/mobile |
| 3:147 | early stop | WORKOUT / finish | same completion action/result | actual accumulated result | desktop/mobile |
| 3:141, 3:159 | personalized result | RESULTS | existing ResultsPage variants | local aggregate result + coach tone | desktop/mobile |
| 3:143 | progress / empty progress | PROGRESS | existing ProgressPage | existing progress summary API/cache | desktop/mobile |
| 3:146 + 3:120 | AI unavailable / deterministic fallback | PLAN / fallback | existing PlanPage + fallback banner | Sprint 3 deterministic generator | desktop/mobile |
| 3:151 | sync pending / offline session | RESULTS / progress | existing BackendBadge / sync controls | existing aggregate queue | desktop/mobile |
| 3:152, 3:153 | RU / KK cue variants | WORKOUT | same shell + localized resolver | prevalidated MovementSpec messages | desktop/mobile |
| 8:562 session header, 3:99/3:101 toggles | voice on/muted/unavailable | WORKOUT | local WorkoutAudio + toggle | SpeechSynthesis/local tones | desktop/mobile |

The source file includes later RV voice/routine screens. Only the reusable routine card is used; planned voice-provider and Calendar integration remain Sprint 4B.

No existing tablet camera frame was found: `3:161` is **tablet-plan**, 834×1112. Camera responsiveness at that size reuses desktop/mobile shell rules and is documented as an inferred counterpart, not a verified tablet Figma frame. Desktop frames are 1440×960; mobile frames 390×844. These dimensions justify the responsive targets.

Figma's snapshot persona copy uses Maya 12 minutes/chair, Arman 20 minutes/bodyweight and Dana 8 minutes/mobility. The explicit Sprint 4A patch overrides the dynamic stories to 15 minutes/no equipment, 30 minutes/dumbbells and 10 minutes/standing. The existing layout, type and token system remain the reference. No unchecked node IDs or invented frame names are presented as Figma evidence.

## Sprint 4A URL navigation follow-up

Existing frame/component mappings above now have concrete browser paths; reusable
loading/error/dialog variants keep their parent path. No extra visual screen was
created for routing.

| Figma frame/node | Screen/state | Route/AppMode | Code component | Data source | Desktop/mobile |
|---|---|---|---|---|---|
| 3:113 / 3:114 | Context intake/goals | `/context` / PROFILE | ContextFlow | Existing profile + AI context | Desktop / stacking mobile |
| 3:115 / 3:116 | Documents / extraction | `/context/documents` / PROFILE | ContextFlow | Owned documents | Desktop / mobile sources |
| 3:117 | Fact review | `/context/review` / PROFILE | ContextFlow | Confirmed/pending/rejected facts | Desktop / stacked mobile |
| 3:120–3:125 | Plans / why / details / swap unavailable | `/plan` / PLAN | PlanExperience | Active plan | Desktop / 3:155 mobile |
| 3:126 / 3:127 / 3:131 | Setup / denied / calibration | `/camera/setup` / CALIBRATION | CameraExperience + CameraCoachShell | Selected spec + local camera | Desktop / 3:156 mobile |
| 3:133 | Countdown | `/camera/countdown` / COUNTDOWN | CameraCoachShell | Local readiness | Desktop / mobile shell |
| 3:134–3:140 | Coaching / correction / recovery / pause / manual | `/workout`, `/workout/paused` | CameraCoachShell | Local pose engine / manual timer | Desktop / 3:157–3:158 mobile |
| 3:141 | Results | `/results` / RESULTS | ResultsPage | Current aggregate | Desktop / 3:159 mobile |
| 3:143 | Progress | `/progress` / PROGRESS | ProgressPage | Existing durable history | Desktop / responsive |

## Sprint4B extension mapping

Existing frames/tokens remain the design baseline. New compositions below have no claimed Figma node or fresh live Figma audit.

| Screen/state | Code component | Data source | Responsive evidence |
|---|---|---|---|
| Hands-first modal | HandsOnboarding + stable CameraStage host | Local preferences/gesture store |360/390mobile,768/834tablet,landscape |
| Voice foreground modal | VoiceSelection | Authenticated account voices/preferences | Wrapped tone controls/scroll/focus |
| Coach and calendar | CoachPanel/SchedulePanel | Owned API proposals/calendar |44px controls/stacked mobile layout |
| Full workout/rest/next/results | CameraCoachShell/RestView/NextExerciseView/SessionResults | Frozen runner snapshot/all durable sets | Primary workout cue first on mobile |

Measured screenshots: [Sprint4B integration report](SPRINT_4B_INTEGRATION_REPORT.md).

## Sprint 4B landing entry follow-up — 2026-09-30

Read desktop welcome `3:111` and mobile welcome `3:154` with design context and
screenshots using the Figma design-to-code skill. Downloaded the actual SVG layers
`4:3` (kinetic reach, native 520×470) and `22:1098` (mobile squat, native 350×238).
The existing 36×36 brand mark and typography/color tokens remain shared.

| Figma frame/node | Route/AppMode | Code component | Responsive counterpart |
|---|---|---|---|
| 3:111 welcome | `/` / LANDING | LandingPage + shared App header | 1440×960 desktop |
| 3:154 m-welcome | `/` / LANDING | LandingPage mobile composition | 390×844 mobile |
| No tablet welcome frame verified | `/` / LANDING | Responsive desktop composition | 834×1112 inferred |

Ordinary first visits show welcome before the hand/audio overlays. Build my plan
opens Context and the existing introductory guide; camera access still requires
the explicit enable action. Name/logo links use native hrefs, browser history and
pinch selection to return home. Development-only legacy fake replay keeps its
existing initial camera mode. Returning home preserves a started camera lease.

Routines entries open the existing Plan view, which displays returned routine
blocks; no new standalone routine catalog is claimed. Mobile Build my plan and
camera-off copy replace prototype-specific demo copy. The footer uses actual
local-camera/privacy text. Demo profiles remains an explicit jury-demo shortcut.
Shared header, guide and loading surfaces use the established design tokens.
