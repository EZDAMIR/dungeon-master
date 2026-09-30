# Application provider composition

Scope: `frontend/src/app/providers/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Reserve app-wide provider wiring; current gesture provider is implemented in its feature.

## Code rules

- This is a placeholder; create provider code only for an authorized global dependency.
- Compose providers once at the app boundary and keep feature behavior in features.
- Do not trigger network mutations, camera permissions or exercise analysis during provider setup.

## Dependencies

Provider composition may import existing feature providers; lower layers must not import runtime provider setup from app.

## Verification

Commands run from `frontend/` unless specified otherwise.
When implemented, test mount/unmount cleanup and render App through the provider; run type checking.

## Code example — global composition pattern (reserved)

Illustrative only; this directory remains reserved. If provider extraction is authorized, compose existing providers once and pass their required props through without starting cameras or mutations during rendering.

```tsx
import type { ComponentProps } from 'react'
import { GestureNavigationProvider } from '../../features/gesture-navigation/GestureNavigationProvider'

// Wrap the existing application composition only when extraction is needed.
type AppProvidersProps = ComponentProps<typeof GestureNavigationProvider>

export function AppProviders(props: AppProvidersProps) {
  return <GestureNavigationProvider {...props} />
}
```
