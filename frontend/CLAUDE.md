# Frontend Instructions

Scope: `frontend/`.

Build a React + TypeScript + Vite browser application. Keep TypeScript strict.
Prefer small, explicit modules over framework-heavy abstractions.

## Folder instructions

Read this file and each nearer `CLAUDE.md` before editing. Every authored folder,
including tests, scripts, assets and reserved folders, has its own guide describing
purpose, code rules, dependencies and verification. `AGENTS.md` applies alongside
these guides; `AGENT.md` remains a compatibility entrypoint.

These rules and their good/bad example style are adapted from
[1wash-front's complete guides](https://github.com/Ya-Sabyr/1wash-front/tree/6e0c35d9f033a8cfb5f8c8840c34c5ae0d0e5021),
using Dungeon Master's existing architecture and stack. Examples below and
in descendant guides use current Dungeon Master contracts. Linked excerpts retain
their original module context; reserved patterns are explicitly illustrative.
Keep direct imports and
flat modules until an implemented capability needs more structure. Add entities,
widgets, barrel exports or new libraries only for a demonstrated need.

`npm run check:instructions` verifies nonempty guides, concrete code examples and
local links for all authored folders. Dependencies, build output and generated model/WASM directories
are excluded using git's ignore rules. Run `npm run test:instructions` when changing
the checker. Add a guide when adding an authored folder.

## Layer responsibilities

- `src/app/`: application providers, router, top-level mode machine and startup.
- `src/pages/`: route-level composition only.
- `src/features/`: user-facing feature UI and feature state.
- `src/vision/`: pure camera/inference post-processing and movement logic.
- `src/audio/`: browser speech and cached-audio adapters.
- `src/api/`: typed backend client.
- `src/store/`: low-frequency global application state.
- `src/types/`: provider-neutral semantic event contracts.
- `src/shared/`: reusable UI and utilities.

Pages and components may subscribe to visual events. They must not implement
landmark math, gesture thresholds, repetition logic, or technique rules.

`app` composes pages/features; pages render state and callbacks; features integrate
vision contracts. Shared runtime modules must not import features, pages or app.
Current type-only app snapshot/mode imports at UI and runtime boundaries are
permitted. Pure vision processors must not depend on app types or UI modules.
Browser/MediaPipe adapters may use video and camera APIs; they remain separate
from deterministic math and state machines.

Use PascalCase component filenames, camelCase helper filenames and descriptive
feature folders. Keep strict types, explicit props and early returns. Follow the
existing CSS, oxlint and Vitest setup. Refactor only to clarify responsibilities,
remove repeated logic or fix an observed issue, with focused behavior tests.

## Visual runtime

- Camera access uses `getUserMedia`.
- Use MediaPipe Tasks Vision in the browser.
- Hand recognition drives menu navigation.
- Pose recognition drives workout analysis.
- Keep model files local under `public/models/` for a reliable demo.
- Process at a bounded inference rate rather than every display frame.
- Move heavy synchronous inference to a worker when supported by the selected API.
- Store per-frame mutable data in ordinary objects or refs, not React state.
- Update React state only for semantic events such as focused target, confirmed
  command, repetition, error, phase or result.

## Gesture-only UX

- The primary demo path must be completable without a mouse or keyboard after
  browser camera permission is granted.
- Use large, separated targets suitable for an imprecise virtual cursor.
- Show the virtual cursor, recognized gesture, hold progress and cooldown.
- Require a hold for destructive or navigation actions.
- Disable menu gestures while an exercise state machine is active, except the
  documented pause command.
- Provide a visible and audible response to every confirmed command.
- Keep conventional controls as an accessibility and debugging fallback, but do not
  rely on them in the demo.

## Reliability

- No backend request belongs in the frame loop.
- No provider request belongs in the frame loop.
- The tutorial, menu, calibration, workout, correction and result screen must work
  with a seeded local workout.
- If the backend fails, queue or discard optional sync and keep the session result
  visible.
- If audio fails, visual feedback remains complete.

## Testing

- Unit-test geometry, smoothing, hysteresis, hold/cooldown, state transitions,
  repetition counting and error rules with fixture landmarks.
- Mock MediaPipe at component boundaries.
- Do not require a real camera in unit tests.
- Add one browser smoke test for the complete flow using a fake vision event source.

## Code examples

### Responsibility and import boundaries

Use explicit imports from existing modules. App composes pages; pages compose
features; shared presentation receives props. Pure vision has no UI dependency.

```ts
// In app/App.tsx: compose route-level screens.
import { ResultsPage } from '../pages/ResultsPage'
// In pages/ResultsPage.tsx: compose registered feature controls.
import { GestureTarget } from '../features/gesture-navigation/GestureTarget'
// In vision/gestures/pinchDetector.ts: use pure geometry and local config.
import { distance } from '../core/geometry'
import { gestureConfig } from './gestureConfig'
```

Avoid these runtime imports in lower layers:

```ts
// Bad inside shared/components: reusable UI becomes feature-dependent.
import { useGestureStore } from '../../features/gesture-navigation/gestureNavigation'
// Bad inside vision/gestures: recognition becomes coupled to routing.
import { App } from '../../app/App'
```

The source project's `entities`, `widgets`, `@/` aliases, mandatory `index.ts`
exports and query/form libraries are not current Dungeon Master conventions.
Keep the existing API/store modules, direct relative imports, CSS, oxlint and
Vitest. Introduce structure or a dependency only for an authorized capability.

### Explicit props and accessible actions

Use named prop types for nontrivial components and descriptive callbacks. This
illustrative page composition uses the existing GestureTarget API; it does not
introduce a new page or target ID.

```tsx
import { GestureTarget } from '../features/gesture-navigation/GestureTarget'

type RepeatWorkoutProps = {
  disabled: boolean
  onRepeat: () => void
}

export function RepeatWorkout({ disabled, onRepeat }: RepeatWorkoutProps) {
  return (
    <GestureTarget id="repeat-squat" disabled={disabled} onSelect={onRepeat}>
      Повторить
    </GestureTarget>
  )
}
```

The registered button shares one action with conventional input. Avoid UI code
that makes exercise decisions or uses a clickable div:

```tsx
// Bad: technique policy belongs in vision/exercises/squat/rules.ts.
if (kneeAngle > 112) setCorrection('Опустись немного ниже')
// Bad: no native keyboard action or gesture registration.
return <div onClick={onRepeat}>Повторить</div>
```

### Narrow semantic events with early returns

Use the existing discriminated union. This illustrative consumer accepts only
confirmed commands and leaves app actions to the caller.

```ts
import type { VisionEvent } from '../types/vision'

export function selectedTarget(event: VisionEvent): string | null {
  if (event.type !== 'gesture.confirmed') return null
  if (event.command !== 'select') return null
  return event.targetId ?? null
}
```

Avoid `any`, copied event unions and direct DOM actions from recognition:

```ts
// Bad: bypasses mode guards and couples recognition to DOM targets.
function handleFrame(event: any) {
  document.getElementById(event.targetId)?.click()
}
```

Keep recognition thresholds named and local, as in
[gestureConfig.ts](src/vision/gestures/gestureConfig.ts) and
[squat/config.ts](src/vision/exercises/squat/config.ts). Components consume
recognized commands, repetition metrics and corrections rather than recomputing
them from landmarks.

### Typed requests and readable failure states

Use the existing API client and pass cancellation through. This transport example
belongs in `src/api/`; profile draft and recovery actions remain in the store.

```ts
import type { ApiClient } from './client'
import type { ProfileUpdate, Profile } from './types'

export function saveProfileRequest(
  client: ApiClient,
  token: string,
  profile: ProfileUpdate,
  signal: AbortSignal,
): Promise<Profile> {
  return client.json<Profile>('/profile', {
    method: 'PUT', token, body: profile, signal,
  })
}
```

ApiClient normalizes unknown failures into ApiError. Show safe messages for
loading, empty, offline, failed and saved states; do not expose raw responses or
tokens. `VITE_*` configuration is public and must contain no provider secrets.
BackendStore owns single-flight bootstrap, bounded retry and local drafts.

Avoid network work in inference callbacks or rendering:

```ts
// Bad inside a frame loop: sends private frame data and ties counting to HTTP.
await fetch('/api/vision', { method: 'POST', body: JSON.stringify(landmarks) })
// Bad inside page rendering: every render can create another mutation.
void client.json('/training-plans/generate', { method: 'POST' })
```

### Deterministic tests of observable behavior

This test uses the existing pure hold gate and an explicit monotonic clock.
It prevents early confirmation and repeated commands during a held fist.
No camera, model or provider is initialized.

```ts
import { expect, it } from 'vitest'
import { HoldGate } from './holdGate'

it('confirms once after a stable hold', () => {
  const gate = new HoldGate()
  expect(gate.update('back', 0).confirmed).toBe(false)
  expect(gate.update('back', 599).confirmed).toBe(false)
  expect(gate.update('back', 600).confirmed).toBe(true)
  expect(gate.update('back', 3000).confirmed).toBe(false)
})
```

Test accessible rendered status, completed repetitions, cancellation, resource
cleanup and visible failure recovery. Avoid assertions that merely mirror a
private field or count arbitrary internal state setters. Restore browser mocks
and clocks after each test. Use the existing test runners and coverage gates.

### Readability and deliberate refactoring

Use names such as `hasSelectedWorkout`, `pendingSessionCount` and
`handleRetrySync`, and single-purpose functions with explicit returns. Comments
should explain a boundary or provider quirk. Keep one styling approach and use
existing classes/tokens for repeated spacing and color. Memoize only when an
observed rendering or dependency issue warrants it.

For example, [meanMinKneeAngle](src/features/results/sessionAggregate.ts) reduces
completed metrics once after Results, while
[CameraErrorView](src/shared/components/CameraErrorView.tsx) only renders an error
and retry callback. Preserve those responsibilities when extracting repeated
code. Start helpers locally and move them to shared only for unrelated consumers.
