# Sprint 4A — Figma visual QA

Reference: [Motion Studio file](https://www.figma.com/design/vFIK97vQDk4xasLgDUdVdN?node-id=3-120), read 2026-09-30. Desktop reference 1440×960, mobile 390×844, tablet plan 834×1112. [Frame map](FIGMA_SPRINT_4A_MAP.md) and [handoff snapshot](FIGMA_HANDOFF_SPRINT_4A.json) identify actual nodes/styles/masters. No new design was created.

Chrome screenshots of the **production build** under `/dungeon-master/` are committed in [screenshots/sprint4a](screenshots/sprint4a/). Synthetic replay screenshots are separately prefixed `dev-`: they use the same interpreter/shell in development, an illustrative Figma SVG, and synthetic landmarks. Development replay controls are hidden only while photographing the layout. They are not evidence of a live webcam or production technique detection. Screenshots were visually inspected beside the Figma reference images; there is no claim of pixel-perfect matching or an automated pixel-diff baseline.

| Figma node/frame | Frontend route/state | Tested viewport | Responsive counterpart | Implementation status | Known visual deviation / evidence |
|---|---|---|---|---|---|
| 3:112 | PROFILE / jury selector | 1440×960 | responsive 390 | implemented / reviewed | three source cards, Maya highlight, exact tokens; Sprint copy overrides source story durations; `jury-desktop.png` |
| 3:113, 3:114 | PROFILE / context | 1440×960 | stacked mobile | implemented / reviewed | goals/equipment use existing ProfileSettings within context; not a separate 3:114 page; `maya-context.png` |
| 3:115 | PROFILE / documents | 1440×960 | mobile stack | implemented / reviewed | actual file chooser, document/status cards; source uses simulated upload in Figma; `documents-desktop.png` |
| 3:116, 3:118 | upload loading/failure | desktop/mobile layout | same document variants | functional variants / tests | synchronous processing is one combined status; no separate visual screenshot of every transient state |
| 3:117 | PROFILE / fact review | 1440×960; 390×844; 834×1112 | responsive stack | implemented / reviewed | real repeated fact cards can extend below the reference's fixed frame; short excerpts/confirmation preserved; `review-*.png` |
| 3:120 | PLAN / Maya | 1440×960; 390×844; 834×1112 | 3:155, 3:161 | implemented / reviewed | source-linked metadata makes exercise rows taller than the 84 px Figma master; whole week scrolls; `maya-plan-desktop.png`, `plan-390.png`, `plan-834.png` |
| 3:121 | PLAN / Arman | 1440×960 | shared 3:155 layout | implemented / reviewed | strength/dumbbell/30-minute copy intentionally follows Sprint patch; `arman-plan-desktop.png` |
| 3:122 | PLAN / Dana | 1440×960 | shared 3:155 layout | implemented / reviewed | 10-minute standing data; extra desk-reset/pre-sleep cards below main workout; `dana-plan-desktop.png` |
| 3:123, 3:145 | PLAN / why and AI profile | 1440×960 | 3:160 source layout | implemented / reviewed | editorial disclosure inside plan, not an independent page; `why-desktop.png` |
| 3:124 | PLAN / exercise details | 1440×960; 390×844; 834×1112 | mobile sheet | implemented / reviewed | desktop native dialog retains two-column panel; source screen is a full page. Preview is illustrative, not a generated recording; `details-*.png` |
| 3:125 | PLAN / swap | desktop/mobile | shared details | honest unavailable control | swapping is disabled, no substitute design/function is claimed |
| 44:1223 | PLAN / lightweight routines | 1440×960; mobile layout | shared cards | implemented | source card is reused; local manual timer only, no Sprint 4B voice workflows |
| 3:126, 3:156 | CALIBRATION / camera setup | 1440×960; 390×844; 834×1112 | 3:156 mobile; inferred tablet | implemented / reviewed | real permission action adds a setup panel before live coaching; mobile may scroll during setup; `camera-390.png`, `camera-834.png` |
| 3:127 | CALIBRATION / denied camera | 1440×960 | shared responsive recovery | implemented / reviewed | source recovery panel reused inside workout shell rather than the source's standalone ivory frame; retry/back/guided actions work; `camera-denied-desktop.png` |
| 3:134, 3:157 | WORKOUT / camera coach | 1440×960; 390×844; 834×1112 | mobile live; inferred tablet | implemented / synthetic review | real webcam replaces Figma's illustrative canvas. `dev-corrected-desktop.png`, `dev-live-390.png`, `dev-live-834.png`; production tracking screenshots still require webcam hardware |
| 3:135, 3:158 | WORKOUT / concrete correction | 1440×960 | mobile cue CSS | implemented / synthetic review | one large «Пятки выше» command and counter, no debug panel; `dev-correction-desktop.png` |
| 3:136, 26:1114 | WORKOUT / corrected attempt | 1440×960 | existing mobile counterpart | implemented / synthetic review | accepted attempt comes from actual interpreter replay; `dev-corrected-desktop.png` |
| 3:137 | WORKOUT / tracking lost | 1440×960 | shared mobile recovery | implemented / synthetic review | partial cancelled, one recovery cue; `dev-tracking-lost-desktop.png` |
| 3:138, 22:1082 | PAUSED | responsive shell rules | existing mobile paused | implemented / tests | no separate paused screenshot; pause retains totals and cancels partial attempt |
| 3:139 | WORKOUT / recovery | responsive shell rules | shared recovery | partial | rest seconds/instruction shown; no automatic rest countdown between sets |
| 3:140, 22:1083 | WORKOUT / manual-only | 1440×960; 390×844; 834×1112 | mobile guided | implemented / reviewed | illustrative preview + timer, no claimed camera assessment; `manual-390.png`, `manual-834.png` |
| 3:141, 3:159 | RESULTS | 1440×960 | responsive two-column stack | implemented / reviewed | source heading hierarchy retained, real metrics/recommendation; `results-manual-desktop.png`, `dev-results-generic-desktop.png` |
| 3:143 | PROGRESS | 1440×960 | responsive cards/list | implemented / reviewed | existing durable progress retained; historical summary/list instead of Figma mock chart; `progress-desktop.png`, `dev-progress-generic-desktop.png` |
| 3:146 + 3:120 | PLAN / AI fallback/offline | responsive variants | shared plan | implemented / tests | exact fallback copy; not separately photographed |
| 3:148, 3:149 | PROFILE / deletion | responsive variants | shared documents | implemented / tests | alert/removed variants reuse source colors/copy hierarchy; not separately photographed |
| 3:151 | sync pending | RESULTS / progress | responsive badge | implemented / tests | existing retry/queue status, not a new screen |
| 3:152, 3:153 | RU/KK preview | WORKOUT | shared shell | implemented / tests | localized prevalidated messages; EN also supported; actual installed speech voices vary |

## Review checks and corrections

Typography uses the 10 Figma text styles, locally served Manrope/Barlow Condensed/IBM Plex Mono, including desktop 64 px cue and mobile 48 px cue. Barlow Condensed has limited Cyrillic coverage: Russian/Kazakh glyphs fall back to Manrope and appear wider; bounds and measured two-line fallback protect readability. This is a known type-rendering deviation, not an invented font system.

Planning colors, graphite surfaces, citron counters/actions, warning/success/error, borders, radii and spacing come from the inspected handoff. No gradients, glassmorphism or chatbot UI were added. Brand SVG is natively 36×36; pose SVGs 780×490; preview containers preserve their geometry with intrinsic sizing/contain. The mobile live source uses 350×180 camera stage and 72/80.64 counter; responsive CSS uses these values. The only existing tablet frame is 3:161 **plan**, not camera.

Review fixed white text on white workout buttons/badges, missing Maya selector highlight, oversized source-chip/action spacing, long generated cues, and retained page scroll after navigating from a long plan/review. Horizontal overflow checks were false at both 390 and 834 px. Details stack as a sheet; source chips wrap; semantic gesture controls retain 52 px targets. Camera counter/cues live outside the image and cannot cover the body. Long content grows the page rather than shrinking the display font.

Empty, loading, failure, unavailable, manual and sync variants are reused and covered by functional tests. Screenshot evidence is intentionally narrower than “every state visually verified.” Actual camera technique detection, two-line reading at full-body distance, installed RU/KK voice playback and a human-timed 3–5-minute jury run remain manual checks. A separate tablet camera source could not be verified because it does not exist in this file. There are no unchecked sources presented as verified frames.

## Sprint 4A URL navigation follow-up

Native planning links keep the existing typography, pill spacing, focus styles
and token colors. The current page uses the existing active-navigation variant.
Browser Chrome QA covered root and `/dungeon-master/` production builds: direct
links/reloads, Back/Forward, context/document/review steps, a persisted synthetic
Maya plan reload, camera denial → manual → results → progress → Back, guarded
abandoned manual links and unknown paths. No page errors; 390/834px plan checks
reported no horizontal overflow. This adds navigation checks to the earlier visual
review, without claiming live-camera or deployment-host validation.

| Figma node/frame | Frontend route/state | Tested viewport | Responsive counterpart | Implementation status | Known visual deviation |
|---|---|---|---|---|---|
| 3:120 Maya plan | `/plan` / PLAN | 1440×960 | 3:155 | [Production navigation screenshot](screenshots/sprint4a/navigation-plan-desktop.png) checked | Earlier plan-row/content deviations still apply |
| 3:155 mobile plan | `/plan` / PLAN | 390×844 | 3:120 | [Production mobile navigation screenshot](screenshots/sprint4a/navigation-plan-mobile.png) checked | Earlier localized display-font fallback still applies |

The frontend host must provide index.html fallback for direct application URLs;
Vite dev/preview fallback was tested. Actual deployment remains outside Sprint 4A.
