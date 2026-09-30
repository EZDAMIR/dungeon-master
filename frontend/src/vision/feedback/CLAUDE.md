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

## Code example — stable issue and recovery windows

Require configured bad samples before displaying a readiness issue and sustained valid input before clearing it. Counting must gate invalid samples immediately, independently of the delayed card.

From [errorPolicy.ts](errorPolicy.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export class ErrorPolicy {
    private samples: Array<CalibrationIssue | null> = [];
    private recoverySince: number | null = null;
    issue: CalibrationIssue | null = null;
    ready = false;
    update(issue: CalibrationIssue | null, at: number) {
        this.samples.push(issue);
        if (this.samples.length > c.readinessWindow)
            this.samples.shift();
        if (issue) {
            this.ready = false;
            this.recoverySince = null;
            if (this.samples.filter(v => v === issue).length >= c.readinessBadSamples)
                this.issue = issue;
        }
        else {
            this.recoverySince ??= at;
            if (at - this.recoverySince >= c.recoveryMs && this.samples.filter(v => v !== null).length <= 1) {
                this.issue = null;
                this.ready = true;
            }
        }
        return { issue: this.issue, ready: this.ready };
    }
    reset() { this.samples = []; this.recoverySince = null; this.issue = null; this.ready = false; }
}
```
