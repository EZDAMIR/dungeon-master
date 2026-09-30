# Sprint 4B demo runbook

Use separate local development data, the existing backend/frontend start commands and canonical settings from [environment delta](SPRINT_4B_ENV_DELTA.md). Apply all migrations first. Do not use a production database for replay checks.

1. Open the app. Choose hands by a physical click, grant browser camera permission, show a hand and practise sensitivity/targets. Finish with released fingers. Alternatively choose mouse; this skips only hand practice.
2. Select language/style/real provider voice, preview then save, or continue without audio. If blocked, use the explicit Enable audio button. Provider errors are visible.
3. Add/confirm context and source facts, request a plan and observe actual job stages. Open exercise instructions. A full-day button executes all plan sets; quick demo is explicitly1×5.
4. Grant workout camera permission by physical action if needed, position the body, wait for calibration/countdown, perform repetitions. Rest/next exercise return to readiness. Manual completion reports user marks separately from camera assessment.
5. Stop after at least one measured rep to review completed plus partial sets. Results appear before sync. Disconnect the network to inspect pending state; reconnect/retry and confirm progress remains idempotent.
6. On Schedule choose a future available time, review proposal, Confirm and download ICS. Use coach text/proposals; microphone recording requires independent permission and has Stop/Cancel.
7. Google connect requires configured OAuth and a consented test calendar. Open-tab reminders do not claim background push.

Explicit synthetic development demo: enable `ENABLE_DEMO_PERSONAS=true`, `ENABLE_FIXTURE_MODE=true` locally and open `/?juryDemo=1`. Persona output is marked SYNTHETIC DEMO/FIXTURE. Add `fakeVision=1` only for synthetic landmarks/replay; it does not verify camera hardware. Ordinary production flow uses actual providers or labelled deterministic fallback.

Current external status is in [sanitized provider proof](contracts/provider-live-verification.json). Never paste or commit credentials or publish raw source/camera data.
