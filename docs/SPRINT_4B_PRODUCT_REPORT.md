# Sprint 4B product implementation

A2 owns connected frontend product composition; final A1+A3 wiring and verification are recorded in SPRINT_4B_INTEGRATION_REPORT.md. No deployment paths are edited.

Implemented: authenticated binary API fetch with cookie credentials, single-flight guest refresh preserving owner, strict owner voice cache, real voices/preferences/preview clients, single audio queue with priority/preemption/dedupe/expiry/cancellation and explicit autoplay recovery, coach turns/provenance/proposal confirmation, bounded push-to-talk, schedule availability/timezone/proposals/ICS/Google status, active-only bounded generation jobs, event-based guide, schedule routing and durable multi-set queue contracts.

Provider audio is fetched to Blob and played from temporary object URLs. Bearer tokens stay in headers. Unavailable preview does not use a synthetic voice; narration can use a labelled browser system voice. Existing WorkoutAudio remains regression-tested legacy code; the App owns only AudioCoordinator. Browser behavior follows [MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) and [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder).

Independent checks: type-check passes; initial focused audio/API/auth/guide/timezone/PTT suite 28 tests passes; existing and new frontend suite 156 tests passes. Root production build passes with installed WASM and pinned verified official models (public artifact cache reused, no secret/env copying). Instruction checker passes 51 authored folders. Remaining lint cleanup and final integrated checks are performed before final handoff. Coverage settings unchanged.

Camera source owner stays mounted across planning/workout changes to preserve its lease. A3 HandsOnboarding and runner are connected after its ready commit; there is no substitute hand wizard in this slice. Real provider/camera/audio manual acceptance is pending when devices/keys are unavailable. Responsive mobile/tablet browser checks follow final integration.
