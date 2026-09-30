# Sprint 4B live and manual acceptance

Automated and localhost browser checks are recorded in the [integration report](SPRINT_4B_INTEGRATION_REPORT.md). Configuration alone does not satisfy live acceptance; [provider proof](contracts/provider-live-verification.json) records actual bounded checks.

- OpenAI: bounded GPT-5.4 structured response verified. Still verify a consented full live profile→plan→spec→coach path and context revision/provenance with a disposable owner, using `scripts/smoke_live_coach.py` and its request cap.
- ElevenLabs: actual account11models/sixvoices and one Russian MP3 preview verified by A1. Verify the full app selection/saved preferences, EN/KK playback, cancellation, expiry and unavailable-language recovery. Kazakh eleven_v3 metadata support is distinct from playback verification. No key belongs in chat/Git/browser.
- STT: physical audio-only permission; genuine30-second ceiling/size/MIME limits; Stop/Cancel/route exit/denial tracks cleanup; recording suppresses narration; actual transcription returned into the text input.
- Browser audio: fresh Chrome/Safari/mobile contexts, physical unlock, blocked-play recovery and visible current subtitles. System narration fallback must say system voice; preview must remain provider-only.
- Hardware: one camera lease through wizard→voice→plan; real hand gain/clutch/release/scope, camera denial/retry/mouse fallback, low light/occlusion/framing, calibration/countdown, sustained tracking loss and paused resume/readiness. No stale target activation between overlays.
- Full session: actual multi-set/multi-exercise counts/rest, early nonempty partial stop, manual0camera acceptance, unknown geometry null, queue idempotency after offline/reload and owner-preserving refresh.
- Google: supplied OAuth settings and owner's explicit consented test calendar; true connect/revoke/refresh status, app-owned event reconciliation, concurrent external conflict/partial sync. Internal schedule/ICS continue when Google is absent.
- Responsive/touch:390/360 mobile and834/768 tablets, portrait/landscape, clear primary cue, visible permissions/controls, modal focus/scroll, touch≥44px, no horizontal overflow. Synthetic screenshot evidence verifies layout, not device accuracy.

Existing CD/deployment paths are excluded from this feature task. Use the owner's established publication/release procedure for the verified committed branch.
