# Sprint 2 — manual camera acceptance

Status: **not performed** in the agent environment. There is no interactive browser/webcam tool. Automated synthetic fixtures, mocked models and HTTP preview checks do not establish real-camera recognition quality or latency. No threshold has been tuned against real people in this Sprint.

## Setup and observation record

Use Node 22.12+, `cd frontend && npm ci && npm run dev`. Open current Chrome or Edge on localhost or HTTPS, using a webcam with enough room for a full side view. Test at least two people when practical, both visible sides, bright/dim light and different backgrounds. Do not record, capture screenshots or keep personal movement traces.

| Observation | Result |
|---|---|
| Browser/version | Not tested |
| Webcam/device class | Not tested |
| Number of testers | 0 |
| Correct counting / bottom hold | Not tested |
| Depth / tempo / extension corrections | Not tested |
| Recovery / countdown cancellation | Not tested |
| Pause / resume / tab switch | Not tested |
| Inference FPS / ms | Real model not profiled |
| Threshold changes from real observations | None |

Record only aggregate observations, device/browser class and configuration changes. Defaults and expected semantics are in [VISION_PIPELINE.md](VISION_PIPELINE.md); defaults are engineering heuristics, not medical standards.

## Acceptance steps

1. Open the app in Chrome or Edge.
2. Grant camera access and complete every gesture tutorial step.
3. Select Bodyweight Squat with pinch and confirm with Thumb Up.
4. Verify CALIBRATION and no second camera permission request.
5. Face the camera.
6. Verify «Повернись боком к камере» and no countdown.
7. Turn sideways.
8. Partially leave the frame or crop the feet.
9. Verify the body/feet positioning correction.
10. Stand with head, shoulders, hips, knees and feet inside the guide.
11. Hold still until all calibration gates complete; verify the named active side.
12. Leave the frame during countdown.
13. Verify cancellation back to CALIBRATION, with zero reps.
14. Calibrate again; verify 3 → 2 → 1 → START.
15. Perform one complete controlled squat.
16. Verify one total and one accepted rep, matching mirrored skeleton/angle.
17. Stay at the bottom for several seconds.
18. Verify no duplicate rep.
19. Perform a shallow complete cycle.
20. Verify «Опустись немного ниже», one total/rejected rep and one depth error.
21. Perform a fast complete cycle.
22. Verify tempo correction and one rejected rep.
23. Start descending again after an ascent without reaching the calibrated standing range.
24. Verify extension correction; one rejected previous cycle, then wait for standing before further counting.
25. Leave the frame during a partial rep.
26. Verify no false completion; a sustained loss triggers recalibration and retains completed reps.
27. Recover full visibility and stable standing.
28. Complete five cycles in total, including rejected cycles; verify RESULTS opens.
29. Check total/accepted/rejected, each error count, mean rep time and recommendation. Multiple errors may occur in one rep, so summed error counts may exceed rejected reps.
30. Return to MENU with Fist or select its target with pinch. Verify hand navigation resumes and camera permission is not requested again.
31. Repeat the workout from RESULTS with Thumb Up or pinch.
32. Verify calibration and all counters reset.
33. From stable standing, raise both hands above the nose for at least 800 ms. Verify one pause. Continued hold must not resume. Lower hands for at least 250 ms, then raise/hold again after cooldown; verify resume and stable-standing synchronization. Repeat with accessible buttons.
34. Switch to another browser tab and return during calibration, countdown and workout.
35. Verify one active inference loop, no spurious rep, sensible recovery, no stale skeleton, and acceptable UI responsiveness.

Also test denied permission, unavailable model, camera disconnection, audio muted/unavailable, no Russian speech voice (tone fallback), resizing/DPR changes, slow hardware and production preview under `/dungeon-master/`. Check dev pose inference FPS/ms without retaining landmarks or frames.

## Acceptance decision

- Automated implementation verification: recorded in the development log.
- Human camera acceptance and tuning: **pending**.
- Do not mark this checklist successful until actual observations are recorded.
