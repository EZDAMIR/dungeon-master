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

## Code example — candidate message contract (reserved)

Illustrative future contract only; no worker is implemented. A generation identifies each model lifecycle so cancelled or stale replies can be rejected. Keep camera permission and UI modes on the main thread.

```ts
type WorkerRequest =
  | { type: 'initialize'; generation: number; modelUrl: string }
  | { type: 'dispose'; generation: number }

type WorkerReply =
  | { type: 'ready'; generation: number }
  | { type: 'error'; generation: number; message: string }

function isCurrentReply(reply: WorkerReply, activeGeneration: number): boolean {
  return reply.generation === activeGeneration
}
```
