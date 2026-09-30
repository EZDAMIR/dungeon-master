# Visual feedback policy

Scope: `frontend/src/vision/feedback/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Prioritize and stabilize readiness/technique feedback independently of rendering or audio.

## Code rules

- errorPolicy.ts owns readinessMessages, ErrorPolicy, feedbackPriority and FeedbackQueue.
- Separate readiness blocking from rep rejection. A delayed readiness card must not permit analysis of invalid samples.
- Use named pose configuration for sample windows, recovery and expiry; readiness outranks technique feedback.
- Emit/clear concrete observable corrections; audio adapters own speech scheduling, while React owns presentation.
- Do not introduce diagnoses or inferred injury/safety judgments.

## Dependencies

Use pose/squat contract types and named vision configuration; no React, DOM, audio playback or provider clients.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/vision/pose/__tests__/pose.test.ts src/vision/pose/__tests__/session.test.ts src/audio`; verify stability, priority, expiration and recovery.
