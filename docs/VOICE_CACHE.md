# ElevenLabs v4 server voice cache — Sprint 4B

The fixed pack contains the 23 public coaching cues and one voice preview, in
Russian, Kazakh and English, for every allowed account voice. Its default style is
supportive. Other styles are cached when requested. Provider model availability
and the account quota are checked before paid preparation; no model fallback is
performed. Normal application calls retain their authentication and ownership checks.
Professional voices with no completed fine-tuning, or voices still requiring
verification, are excluded from selectable voices and reported by the CLI plan.
They can be prepared after ElevenLabs makes them available; no training or
verification bypass is attempted.

Configure the VPS runtime file (outside Git and webroot):

```dotenv
ELEVENLABS_MODEL_RU=eleven_v4
ELEVENLABS_MODEL_EN=eleven_v4
ELEVENLABS_MODEL_KK=eleven_v4
AUDIO_SHARED_CACHE_DIR=/var/cache/dungeon-master/voice
AUDIO_SHARED_CACHE_MAX_MB=1024
ELEVENLABS_BATCH_TIMEOUT_SECONDS=120
```

Compose mounts the named volume `dungeon-master-voice-assets`. Both API workers
and the administrative CLI share it, including across container replacements.
The image creates the mount directory with the application's ownership and includes
ffmpeg. The default empty cache path preserves the previous memory-only behavior.

Run a read-only plan first; `--execute` spends the explicitly approved provider quota:

```bash
docker exec dungeon-master-backend-1 python -m src.cli.warm_voice_cache
docker exec dungeon-master-backend-1 python -m src.cli.warm_voice_cache \
  --execute --max-characters 95000
```

Optional `--voice-id`, `--languages ru kk en`, and `--style` limit preparation.
The character ceiling is also bounded by the subscription's remaining quota.
Paid requests are sequential and stop on a failure. Re-running resumes saved work.

Each voice/language is generated as a single timed v4 pack. Punctuation and curated
v4 delivery tags control phrasing; short countdown words remain untagged. The paid
JSON response is saved before ffmpeg cuts individual MP3s using provider character
timestamps. A failed cut can resume without paying for another generation.
Input seeking skips most preceding audio during each cut, with half a second of
decoder preroll before precise trimming to preserve initial phonemes.
Invalid or incomplete timestamps stop preparation rather than publishing wrong clips.

The voice preview uses natural coaching copy with punctuation for pauses and
questions, versioned as `preview-v2`. Preview playback and the preparation catalog
share that version, so an older demo cannot be returned for the updated text.
Voice cards summarize the API's descriptive labels and description in the selected
interface language. Missing or unusable metadata prompts the user to listen to a
sample instead of inventing acoustic characteristics.

Keys include voice, model, language, style, exact text, cue version, delivery version
and output format. Atomic replacements and file locks coordinate processes; disk
capacity is bounded. Static clips have no time expiry; a version/text change creates
new keys. Personal coach answers and private exercise specifications remain in the
owner-scoped, time-limited memory cache and are never written into this volume.

HTTP still returns authenticated MP3 responses with `X-Audio-Cache: hit|miss` and
`Cache-Control: private, no-store`. The browser can preload the whole static catalog
and retain it across routes; voice/language reconfiguration clears local clips.
Back up this volume alongside the database. Do not prune it during deployment.
