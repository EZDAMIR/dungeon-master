# Sprint 4A context and source-linked plan

Extends [feature guide](../CLAUDE.md). Reuse the existing backend store, gesture targets and camera runtime.
Figma 3:113 / 3:117 / 3:120 / 3:134 owns layout. AI only supplies bounded data.
No standalone dashboard or chatbot. Jury entry is query-controlled, synthetic and isolated by guest.

Example from [PlanExperience.tsx](PlanExperience.tsx):
```tsx
<CameraCoachingBadge mode={item.camera_coaching_mode} synthetic={plan.status==='synthetic'}/>
```
Run `npm run test`, `npm run type-check`, and screenshot planning/camera at 1440, 834, 390px.
