# A1 Sprint 4B API contract v1 (2026-09-30)
All paths prefix /api/v1. Bearer auth for personal routes; credentials: include for guest/refresh/logout. No token URL parameters. Existing flat errors: {detail,status?}; provider failure 503 status=config|invalid_key|quota|rate_limit|timeout|schema|network; validation422; conflict409; budget429.

## Identity
POST /auth/guest existing GuestToken plus HttpOnly dm_refresh cookie. POST /auth/refresh {} => same GuestToken, same user.id + rotated cookie. POST /auth/logout {} => {revoked:true}. POST /auth/session {} with Bearer bootstraps refresh for legacy valid guests => GuestToken. Cookie routes require Origin matching APP_PUBLIC_URL or CORS_ORIGINS (local test origin allowed only outside production). Cookie SameSite=lax, Secure for HTTPS/production.

## Capabilities
GET /capabilities public => {openai:{configured,disabled,unavailable,last_check,model},elevenlabs:{configured,disabled,unavailable,last_check},transcription:{configured,disabled,unavailable,last_check,model},google:{configured,disabled,unavailable,last_check},execution_mode:"live"}. configured does not mean verified; last_check nullable.

## Voices/preferences/speech
GET /voices?language=ru&page_size=6&next_page_token=... => {voices:[{voice_id,name,description,labels}],has_more,next_page_token,model_id,language}. IDs provider-owned. GET /voices/models => {models:[{model_id,name,languages:[{language_id,name}],can_do_text_to_speech}]}.
POST /voices/{voice_id}/preview {language:"ru",style:"supportive"} => audio/mpeg binary, private/no-store, X-Audio-Cache: hit|miss, X-Speech-Provider: elevenlabs. Errors JSON, never audio.
GET /coach/preferences => {voice_id:null,language:"ru",style:"supportive",audio_enabled:false,revision:0}; PUT full {voice_id:string|null,language:"ru"|"kk"|"en",style:"calm"|"supportive"|"energetic"|"strict",audio_enabled:boolean} => preferences+revision.
POST /speech {cue_id?:string,message_id?:UUID,exercise_key?:string,spec_revision?:UUID} exactly one cue_id/message_id. Exercise-specific cue requires exercise key + current owned spec_revision. No arbitrary text. Preferences select voice/language/style. Returns authenticated audio/mpeg.
POST /speech/prewarm {cue_ids:["welcome","camera_permission","gesture_point","gesture_pinch","tracking_recovery","countdown_3"],exercise_key?:string,spec_revision?:UUID} max8 => {prepared:[ids],failed:[ids]}. GET speech does not expose a public URL.
Static cue IDs initially: welcome,context_choice,plan_generating,plan_ready,camera_permission,gesture_point,gesture_pinch,gesture_fist,gesture_thumb,tracking_recovery,stop,countdown_3,countdown_2,countdown_1,start,good_rep,set_complete,rest,next_exercise,workout_complete,depth_insufficient,too_fast,incomplete_extension. Localized ru/kk/en.

## Coach
POST /coach/turns {operation_id:UUID,conversation_id:UUID|null,text:string(1..2000),screen:"planning"|"schedule"|"results"|"exercise"|"settings",exercise_key:string|null} => {conversation_id,message_id,display_text,speech_text,source_references:[],proposal_ids:[],proposals:[],ui_actions:[],provenance:{execution_mode,model_used,prompt_version,generated_at,input_revision,cached},error_category:null|string}. Stable operation_id retries return saved message.
POST /coach/transcribe multipart file + language ru|kk|en + duration_seconds<=30 => {text,provenance:{provider:"openai",model_used}}. Max4MB MIME webm/ogg/wav/mpeg/mp4. File closed after request.
POST /coach/proposals/{id}/confirm {operation_id:UUID} => proposal; POST reject same. Proposal {id,kind:"schedule"|"plan_change"|"exercise_swap",payload,source_revision,payload_hash,expires_at,status:"pending"|"confirmed"|"rejected",result:null|object}. Proposal owner/expiry/revision/hash checked. ui_actions: open_plan/open_schedule/open_progress/open_exercise/open_camera; never starts workout.

## Schedule
GET /schedule/preferences => {timezone:"Asia/Almaty",duration_minutes:20,availability:[{weekday:0,start_minute:1080,end_minute:1260}],revision:0}. PUT full timezone/duration_minutes/availability + expected_revision => same with revision+1.
GET /schedule?starts_on=YYYY-MM-DD => {timezone,revision,appointments:[{id,title,starts_at,ends_at,status,plan_id,sync_status}],slots:[{starts_at,ends_at}]} 7-day bounded UTC instants; slots generated deterministically with DST validation.
POST /schedule/proposals {operation_id:UUID,expected_revision:int,action:"create"|"move"|"cancel"|"skip"|"complete",appointment_id:UUID|null,starts_at:aware ISO|null,duration_minutes:5..120,title:string(1..120),plan_id:UUID|null} => proposal. Confirm through shared coach endpoint. Cancellation/move require owned appointment. Stale409.
GET /schedule/export.ics => text/calendar download with stable UID and UTC timestamps + X-WR-TIMEZONE. No Google required.

## Generation jobs
POST /generation-jobs {operation_id:UUID,execution_mode:"live"|"fixture"} =>202 {id,status,stage,completed_specs,total_specs,result_plan_id,error_category,created_at,updated_at,input_revision}. GET /generation-jobs/{id} same. POST /generation-jobs/{id}/cancel {operation_id:UUID} same. status queued/running/completed/fallback/failed/cancelled/interrupted. Atomic DB leases support existing multiworker topology. Fixture only allowed by ENABLE_FIXTURE_MODE. Existing synchronous generate remains compatible but UI should use jobs.

## Google
POST /integrations/google/authorize {operation_id:UUID} => {authorization_url,expires_at}; GET callback state/code (no Bearer) => {connected:true}; GET status => {configured,connected,sync_status}; DELETE connection => {connected:false}; POST sync {operation_id:UUID} => {synced:int,failed:int,status}. Disabled config503; local schedule unaffected.

## Workout (existing /workout-sessions)
POST session existing payload. POST /workout-sessions/{id}/sets existing payload plus optional assessment_mode:"camera"|"manual" default camera, completion_status:"completed"|"partial" default completed, spec_revision:UUID|null default null, target_snapshot:{target_reps:int|null,duration_seconds:int|null,rest_seconds:int,plan_sets:int}|null default null. set_index globally unique 1-based across session. metrics:{mean_rep_duration_ms:number|null,mean_min_knee_angle:number|null}; legacy numeric fields accepted; generic missing=null. Manual accepted_reps MUST=0 and error_counts/generic_error_counts=0/{}; total_reps is actual user-reported reps if known, otherwise0. Completion summary existing fields: total_reps includes user-reported manual reps; accepted_reps/rejected_reps apply camera only (rejected excludes manual); optional total_sets,camera_total_reps,manual_completed_sets defaults omitted for legacy. Every set immutable and stable client_set_id. Server verifies summary against ALL sets. Progress acceptance denominator camera_total_reps; adds total_sets/manual_completed_sets.


## Final contract changelog v2
- GET /ai-profile/current returns the saved profile; do not regenerate on reload.
- GET /exercise-specs/{exercise_key} exposes `spec_revision` equal to the immutable declaration UUID. Regeneration creates a new UUID and retains old revisions for owner-scoped session/audio references.
- Speech additionally accepts exercise-scoped `calibration`, `error:<rule_code>`, `phase:<phase_id>` and declared `coach_messages` keys, with the exercise_key/spec_revision pair. Static cue text is in CUES.json and docs/contracts/release-cues.json.
- POST sets requires the existing engine_version string and persists its actual per-set value. Parent engine `workout-session-v1` opts into mixed camera/manual engines; legacy parent engines continue requiring exact per-set matching.
- Progress counters use actual durable sets even for legacy summary JSON without new counters.
- All request objects are complete replacements and reject extra properties. New domains document 400/403/429/503. IP daily cap uses the actual socket peer, never spoofable forwarded headers; no proxy/CD changes.
- Job creation enforces the per-user generation cap and input revision; leases prevent duplicate worker claims. Provider stages and plan activation stop after cancellation, stale source proposals expire.
- Exact response schemas, required/nullability fields and authenticated binary content are in release-api.openapi.json, exported from the actual FastAPI application.

Final additive clarification: action complete marks an already-started owned planned appointment completed only after revision-checked confirmation; a future appointment is rejected409. It is user-reported appointment completion and does not create camera metrics.
