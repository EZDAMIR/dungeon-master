# Sprint 1 — Manual camera verification

Status: **not performed**. The agent environment has no available browser/webcam tool. Automated camera and recognizer tests use mocks; they do not prove real tracking quality, GPU compatibility or usability.

Record browser/version, OS/device, webcam, viewport, lighting, hand used, observed inference FPS/time and outcomes below. Start with current Chrome or Edge on localhost.

1. [ ] Open localhost in current Chrome or Edge.
2. [ ] Click «Включить камеру».
3. [ ] Grant camera access; verify no microphone permission appears.
4. [ ] Confirm preview is mirrored.
5. [ ] Show your palm; verify landmarks and hand-found status.
6. [ ] Move the cursor to all four viewport corners; confirm left/right match mirrored preview.
7. [ ] Perform pinch ten times on a target, releasing between attempts.
8. [ ] Hold a pinch; verify no duplicate select. Try pinch outside the target; no navigation should occur.
9. [ ] Hold a fist for at least 600 ms.
10. [ ] Verify exactly one back event (a tutorial step while learning).
11. [ ] Keep holding the fist another two seconds.
12. [ ] Verify a second back event did not appear.
13. [ ] Release to a neutral gesture for at least 200 ms and perform fist again after cooldown.
14. [ ] Hold Thumb Up for at least 600 ms; verify one confirm event.
15. [ ] Hide the hand during a hold.
16. [ ] Verify candidate/progress/focus cancel immediately and cursor hides after the short grace period. Reacquire and verify recovery.
17. [ ] Complete all five tutorial steps without conventional input.
18. [ ] In MENU select Bodyweight Squat with pinch; remain in MENU with a selected card.
19. [ ] Hold Thumb Up to confirm. Also test Thumb Up before selection; remain in MENU and see the instruction.
20. [ ] Reach CALIBRATION without mouse/keyboard after the initial camera permission action. Fist returns to MENU; fist again returns to a usable tutorial.
21. [ ] Switch to another tab and return.
22. [ ] Verify there is one inference loop; hidden tab performs no inference and old holds do not complete from hidden time.
23. [ ] Disconnect/end the camera track.
24. [ ] Verify recognition stops, cursor disappears, a clear error is shown, and Retry recovers after reconnection.

Additional matrix: left/right hand, bright/dim light, plain/busy background, close/far hand, narrow/mobile viewport, laptop webcam, GPU and CPU fallback where available, repeated start/unmount. Confirm keyboard focus, semantic buttons, visible text with sound unavailable and reduced-motion preference.

## Observations

- Browser/device: not tested.
- Camera: not tested.
- Lighting/hand/viewport: not tested.
- Recognition reliability / pinch count / duplicated command count: not tested.
- Inference performance: not measured on real video.
- Result: pending manual verification.
