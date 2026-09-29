# Frontend Agent Guide

Scope: `frontend/`.

Read `CLAUDE.md`, `../docs/VISION_PIPELINE.md`, and
`src/vision/CLAUDE.md` before changing camera or movement code.

## Development sequence

1. Create a static application shell and route structure.
2. Add a fake vision event source and complete the entire UX flow with it.
3. Add camera permission and preview.
4. Replace fake hand events with the hand recognizer.
5. Add pose calibration and squat analysis.
6. Add backend sync only after the local flow is stable.
7. Add optional calendar and voice integrations last.

This sequence prevents UI work from being blocked by model inference.

## Code rules

- Use discriminated unions for vision events and application modes.
- Put thresholds in named configuration objects.
- Keep low-level vision code independent of React and the DOM.
- Dispatch semantic actions instead of calling `.click()` from the vision core.
- Use `AbortController` for cancellable startup and API operations.
- Stop media tracks and dispose recognizers on unmount or mode change.
- Do not update global state on every frame.
- Do not put secrets in frontend environment variables.

## Completion checks

- Type checking passes.
- Unit tests pass.
- Production build passes.
- Camera tracks stop when leaving the experience.
- The app handles denied camera permission.
- The app handles lost hand/body visibility.
- The complete flow works with the fake event source and with a real camera.
