# Sprint 3 — Manual acceptance checklist

Status: **NOT PERFORMED** in the agent environment. Synthetic/mocked automated
checks do not count as live camera/browser acceptance. Record only aggregate
observations; never paste JWTs, Authorization headers, health notes, recordings,
images or raw landmarks. Use a local disposable development database, not production.

## End-to-end checks

1. [ ] Start PostgreSQL/backend; apply the complete migration chain.
2. [ ] Start frontend with VITE_API_BASE_URL and configured backend CORS origin.
3. [ ] Clear this test browser's localStorage.
4. [ ] Open the app and enable the camera explicitly.
5. [ ] Verify one guest is created once, not once per render.
6. [ ] Reload.
7. [ ] Verify the same unexpired guest is restored through /auth/me.
8. [ ] Verify default profile: general fitness, beginner, 3 days, 20 minutes, none, no restrictions.
9. [ ] Change profile using pointer/pinch gesture controls; check every step and Save.
10. [ ] Reload and verify saved profile persists.
11. [ ] Check current deterministic plan and its weekly days, 1×5 squat and controlled tempo.
12. [ ] Generate a new plan through its gesture-accessible action.
13. [ ] Verify the previous plan is archived and only one active plan remains (aggregate DB observation).
14. [ ] Complete side-view calibration/countdown and the five-cycle workout.
15. [ ] Verify Results opens immediately, without waiting for backend requests.
16. [ ] Verify Results status becomes «Сохранено» after synchronization.
17. [ ] Open «Прогресс» using gestures; check Fist Back returns to Menu.
18. [ ] Verify saved repetition totals, accepted percentage and error counts match Results.
19. [ ] Perform a second workout.
20. [ ] Verify completed-session and repetition/error totals aggregate correctly.
21. [ ] Stop only the local test backend.
22. [ ] Perform another workout offline; verify tutorial/camera/calibration stay usable.
23. [ ] Verify Results still opens and remains visible with its local totals.
24. [ ] Verify «Ожидает синхронизации» and aggregate pending entry survive reload.
25. [ ] Restart the test backend.
26. [ ] Trigger «Повторить синхронизацию» (also check browser online trigger).
27. [ ] Verify the pending workout appears exactly once in saved progress.
28. [ ] Reload several times.
29. [ ] Verify no duplicate completed sessions/sets and no automatic repeated plan generation.
30. [ ] Create a second guest in another browser profile; inspect its default profile/progress.
31. [ ] Verify each guest sees only its own profile, plan, sessions and progress.
32. [ ] Check workout feedback readability at full-body distance as described below.
33. [ ] Check mobile/narrow viewport, target sizes, contrast and banner/HUD separation.
34. [ ] Deny/block the backend connection; verify degraded status without blank screen or lost result.
35. [ ] Inspect request field names only: no secrets in payload/logs, user_id, raw landmarks, frames, video, image or screenshot.

## Camera-distance feedback

- [ ] Stand at normal full-body working distance, approximately **2–4 metres** from a laptop.
- [ ] Perform a shallow rep and read «Опустись немного ниже» without approaching the screen.
- [ ] Perform a fast rep and read «Медленнее вниз, контролируй движение» without approaching.
- [ ] Check incomplete extension and briefly lost tracking: errors remain visible long enough to read.
- [ ] Confirm high contrast, stable height and skeleton/debug layers below the banner.
- [ ] Mute speech: visual corrections still suffice. Check screen-reader fallback if available.
- [ ] Enable prefers-reduced-motion and verify no distracting banner animation.

## Boundary checks

- [ ] Confirm «Избегать глубокой нагрузки на колени» explicitly excludes squat from the plan; show no-eligible message and separately labelled local demo action.
- [ ] Offline profile edit remains a local draft and is saved after reconnection.
- [ ] Cached Progress is labelled; a guest with no saved history sees the empty message.
- [ ] Simulate storage denial: local workout works and lack of reload persistence is stated.
- [ ] Check queue capacity with synthetic aggregate test entries only: 20 remain pending; entry 21 is refused explicitly and its Results stays visible.
- [ ] After token expiry/401, verify one controlled new-guest bootstrap, no infinite loop and no reassignment of former-guest pending entries. This sprint has no refresh/account recovery credential.

## Observation record

| Check | Date/browser/device | Aggregate observation | Result |
|---|---|---|---|
| Guest/profile/plan reload | Not performed | — | Pending |
| Gesture Profile/Plan/Progress | Not performed | — | Pending |
| Immediate Results/online sync | Not performed | — | Pending |
| Offline/retry/no duplicates | Not performed | — | Pending |
| Cross-user isolation | Not performed | — | Pending |
| Feedback at 2–4 m | Not performed | — | Pending |
| Narrow viewport/storage denial | Not performed | — | Pending |

Leave unchecked steps pending until actually performed. Existing Sprint 1/2 real
camera recognition, calibration accuracy and person/device threshold checks
remain applicable. This checklist makes no medical accuracy or safety claim.
