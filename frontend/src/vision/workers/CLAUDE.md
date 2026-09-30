# Inference worker reservation

Scope: `frontend/src/vision/workers/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Reserve a future worker boundary if measured browser performance requires it.

## Code rules

- This is a placeholder; do not move inference to workers without an authorized change and supported adapter API.
- Define typed lifecycle/cancellation messages and keep model switches serialized.
- Do not retain camera images after processing or send raw camera/landmark data to a server.
- Keep browser permission, UI and app modes outside worker logic.

## Dependencies

Future worker code may use recognizer adapters and provider-neutral contracts; no React, routing or backend requests.

## Verification

Commands run from `frontend/` unless specified otherwise.
When implemented, test startup/disposal races, stale messages, bounded inference and main-thread fallback; profile real devices.
