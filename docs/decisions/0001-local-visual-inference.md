# ADR 0001: Run visual inference in the browser

Status: accepted.

## Decision

Hand and pose inference, landmark post-processing, repetition counting and
technique rules run in the browser.

## Reasons

- Lower feedback latency.
- Core demo survives backend failure.
- No continuous transfer of sensitive camera frames.
- Direct alignment with a browser webcam controller.
- Lower backend compute and simpler deployment.

## Consequences

- Frontend architecture includes a pure visual core.
- Target-device performance must be profiled.
- Models are shipped or cached with the frontend.
- The backend accepts compact summaries instead of raw visual data.
