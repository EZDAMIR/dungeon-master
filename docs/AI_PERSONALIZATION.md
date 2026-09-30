# Sprint 4A — Personal AI Coach

This is a hackathon prototype using synthetic demo data. It is not a medical system or a product for real patients. It does not diagnose, recommend medicines, change treatment, or claim medical accuracy.

The existing flow is context → optional document → fact review → personalized plan → camera → results → progress. `?juryDemo=1` reveals Maya, Arman and Dana inside context; it adds no main-menu dashboard. Each frontend selection creates a separate guest so comparison does not mix documents or progress.

| Persona | Schedule | Exercises | Volume / rest | Coach / extra routines |
|---|---|---|---|---|
| Maya — Low-Impact Return | 2 days, 15 min | Standing Calf Raise, Controlled Squat | 2 × 6, 90 s; controlled tempo | supportive, RU; morning reset |
| Arman — Strength | 4 days, 30 min | Dumbbell Bicep Curl, Goblet Squat | 3 × 12, 45 s; strength tempo | energetic, RU; no extra routines |
| Dana — Desk Reset | 3 days, 10 min | Standing Calf Raise | 1 × 5, 60 s; standing movements | supportive, KK; desk reset and pre-sleep |

These instant jury plans and specs are explicitly labelled **synthetic fixtures**, not live LLM output. Repeated fixture generation preserves its structure and gives fresh private exercise identities. Normal contexts use the official SDK when enabled. Mocked-provider tests verify differing generation results. No real API call was needed for verification.

## Sources and confirmation

The existing fitness profile and progress join the user's full-replacement AI context. Upload accepts text-layer PDF, UTF-8 TXT and Markdown: 5 MB, 5 documents, 50,000 extracted characters. PDF scans/OCR are unsupported. Raw files are discarded after synchronous extraction; extracted text, chunks and embeddings live in PostgreSQL.

Fact review exposes at most 12 short normalized facts with source excerpts, source document and Confirm/Reject. Pending/rejected facts do not enter personalization. Confirmed constraint codes are combined with confirmed fitness-profile constraints. Source removal deletes its facts/chunks, invalidates the AI profile and archives the active AI plan. Context/profile/fact edits also invalidate active AI personalization.

Chunking targets 1,600 characters with 200-character overlap, preserves paragraphs where possible and allows at most 30 chunks. Oversized chunk counts fail visibly instead of silently dropping document content. RAG uses top-5 cosine similarity over JSONB embeddings; unavailable embeddings use lexical overlap. Provider personalization receives only confirmed excerpts from retrieved chunks. Retrieval and persistence always filter the authenticated owner.

## AI generation and fallback

Set `AI_FEATURE_ENABLED=true`, `OPENAI_API_KEY`, `OPENAI_MODEL` and `OPENAI_EMBEDDING_MODEL` locally. Without a key/model, the Sprint 3 deterministic plan and squat analyzer remain available. The plan banner says: «AI временно недоступен. Мы подготовили базовый план по вашим настройкам».

Versioned prompts are `user_profile_v1`, `workout_plan_v1`, `movement_spec_v1`, `movement_spec_repair_v1`. The official OpenAI Python SDK is pinned to 3.22.1; pypdf to 6.19.0. Structured responses use strict Pydantic/JSON schemas, not Markdown parsing. Provider internals, headers and API keys are not persisted. Profile and plan output are checked for confirmed constraints, owned source references, equipment and time/volume bounds. Plan generation has a 90-second total timeout and at most four concurrent spec preparations.

An AI plan can define private exercise variants; each requested camera exercise gets a MovementSpec, one repair attempt and then a manual fallback if necessary. Plans remain usable when one item is manual. Saved plan runs include structured output and retrieved chunk IDs. User-edited context is sent without response-only IDs/timestamps.

## Browser coaching

The same camera manager, MediaPipe adapter, PoseSession, smoothing, overlay and VisionEvent contracts serve generic coaching. The AI describes landmarks, features, movement stages, transitions, repetition edges and corrections; it never generates a layout or executable code. Raw video and per-frame landmarks stay in the browser. Only aggregate session results reach the existing sync queue/progress API.

[MovementSpec contract](MOVEMENT_SPEC_V1.md), [Figma mapping](FIGMA_SPRINT_4A_MAP.md), [visual QA](FIGMA_VISUAL_QA.md), and [manual checklist](SPRINT_4A_MANUAL_CHECKLIST.md) describe verification and remaining limits.

Swap is honestly disabled. One demo set is completed at a time; repeating starts another set/session. Lightweight routines are separate manual timers and are displayed only when returned by the plan; they do not claim camera analysis or replace the main workout. SpeechSynthesis/local tones are optional, muted initially, and report unavailable language voices as a visual-only fallback. No microphone capture, ElevenLabs or Calendar is implemented in Sprint 4A.
