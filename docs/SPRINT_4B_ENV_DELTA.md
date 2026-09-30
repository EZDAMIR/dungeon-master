# Sprint 4B application environment delta

Only new application variables are listed. Existing OpenAI settings now default to gpt-5.4 and text-embedding-3-small; real credentials remain external. No workflow, server, SSH, Docker, compose, volume or deployment changes.

| Variable | Default | Secret | Purpose |
|---|---|---|---|
| `OPENAI_REASONING_EFFORT_CHAT` | `'low'` | no | Provider reasoning/output/concurrency or separate transcription model. |
| `OPENAI_REASONING_EFFORT_PLAN` | `'medium'` | no | Provider reasoning/output/concurrency or separate transcription model. |
| `OPENAI_OUTPUT_CHAT` | `1800` | no | Provider reasoning/output/concurrency or separate transcription model. |
| `OPENAI_OUTPUT_PROFILE` | `4000` | no | Provider reasoning/output/concurrency or separate transcription model. |
| `OPENAI_OUTPUT_PLAN` | `8000` | no | Provider reasoning/output/concurrency or separate transcription model. |
| `OPENAI_OUTPUT_SPEC` | `10000` | no | Provider reasoning/output/concurrency or separate transcription model. |
| `COACH_EXECUTION_MODE` | `'live'` | no | Default live/fixture/fallback provenance; fixture needs a separate opt-in. |
| `ENABLE_FIXTURE_MODE` | `False` | no | Explicit fixture authorization; disabled by default. |
| `COACH_MAX_TOOL_ROUNDS` | `4` | no | Bounded tool loop and durable per-user/socket-peer daily limits. |
| `PROVIDER_IP_DAILY_REQUEST_CAP` | `300` | no | Bounded tool loop and durable per-user/socket-peer daily limits. |
| `OPENAI_MAX_CONCURRENCY` | `4` | no | Provider reasoning/output/concurrency or separate transcription model. |
| `COACH_DAILY_REQUEST_CAP` | `60` | no | Bounded tool loop and durable per-user/socket-peer daily limits. |
| `GENERATION_JOB_TIMEOUT_SECONDS` | `180` | no | Durable generation lease/deadline and per-process worker concurrency. |
| `GENERATION_JOB_CONCURRENCY` | `1` | no | Durable generation lease/deadline and per-process worker concurrency. |
| `ELEVENLABS_ENABLED` | `True` | no | Account voice/model/output selection and bounded synthesis. KK model capability is checked against account models. |
| `ELEVENLABS_API_KEY` | `''` | yes | Account voice/model/output selection and bounded synthesis. KK model capability is checked against account models. |
| `ELEVENLABS_MODEL_RU` | `'eleven_flash_v2_5'` | no | Account voice/model/output selection and bounded synthesis. KK model capability is checked against account models. |
| `ELEVENLABS_MODEL_EN` | `'eleven_flash_v2_5'` | no | Account voice/model/output selection and bounded synthesis. KK model capability is checked against account models. |
| `ELEVENLABS_MODEL_KK` | `'eleven_v3'` | no | Account voice/model/output selection and bounded synthesis. KK model capability is checked against account models. |
| `ELEVENLABS_DEFAULT_VOICE_ID` | `''` | no | Account voice/model/output selection and bounded synthesis. KK model capability is checked against account models. |
| `ELEVENLABS_ALLOWED_VOICE_IDS` | `''` | no | Account voice/model/output selection and bounded synthesis. KK model capability is checked against account models. |
| `ELEVENLABS_OUTPUT_FORMAT` | `'mp3_44100_128'` | no | Account voice/model/output selection and bounded synthesis. KK model capability is checked against account models. |
| `ELEVENLABS_TIMEOUT_SECONDS` | `20` | no | Account voice/model/output selection and bounded synthesis. KK model capability is checked against account models. |
| `ELEVENLABS_MAX_CONCURRENCY` | `2` | no | Account voice/model/output selection and bounded synthesis. KK model capability is checked against account models. |
| `VOICE_INPUT_ENABLED` | `True` | no | Push-to-talk switch and maximum recording duration/upload bytes. |
| `OPENAI_TRANSCRIBE_MODEL` | `'gpt-4o-mini-transcribe'` | no | Provider reasoning/output/concurrency or separate transcription model. |
| `VOICE_INPUT_MAX_SECONDS` | `30` | no | Push-to-talk switch and maximum recording duration/upload bytes. |
| `VOICE_INPUT_MAX_BYTES` | `4194304` | no | Push-to-talk switch and maximum recording duration/upload bytes. |
| `AUDIO_CACHE_MAX_MB` | `100` | no | Private process-memory audio cache and durable daily synthesis budget. |
| `PERSONAL_AUDIO_TTL_SECONDS` | `3600` | no | Private process-memory audio cache and durable daily synthesis budget. |
| `AUDIO_DAILY_CHARACTER_CAP` | `10000` | no | Private process-memory audio cache and durable daily synthesis budget. |
| `GOOGLE_CALENDAR_ENABLED` | `False` | no | Optional real Google OAuth and encrypted token storage; internal schedule works without it. |
| `GOOGLE_CLIENT_ID` | `''` | no | Optional real Google OAuth and encrypted token storage; internal schedule works without it. |
| `GOOGLE_CLIENT_SECRET` | `''` | yes | Optional real Google OAuth and encrypted token storage; internal schedule works without it. |
| `GOOGLE_REDIRECT_URI` | `''` | no | Optional real Google OAuth and encrypted token storage; internal schedule works without it. |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | `''` | yes | Optional real Google OAuth and encrypted token storage; internal schedule works without it. |
| `GUEST_REFRESH_TTL_DAYS` | `7` | no | Revocable, rotating guest recovery cookie lifetime. |
| `APP_PUBLIC_URL` | `''` | no | Trusted browser origin for guest refresh CSRF and secure cookies. |

Audio stays in bounded, owner-scoped process memory. No additional writable cache path or volume is required. Multiple workers may each cache the same bounded audio; budget counters and generation claims are shared through Postgres. Cache misses after restart synthesize again.

OAuth encryption needs a valid Fernet key supplied externally; key rotation needs a deliberate token migration/reconnection. Do not place credentials in frontend variables or commit them.

The IP cap intentionally uses request.client.host. Under an existing reverse proxy, users share the peer budget; select the application limit with this topology in mind. This task does not change proxy trust or deployment.
