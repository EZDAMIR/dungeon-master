"""Authenticated cue/message synthesis with owner-scoped bounded memory cache."""

import asyncio
import collections
import time

import fastapi

from ...ai import elevenlabs
from ...ai import openai
from ...core import config
from .. import exceptions
from .. import models
from .. import schemas
from .schedule import payload_hash

# Prepared translations. No model/translation calls occur in the exercise loop.
CUES = {
    'welcome': (
        'Я помогу настроиться и пройти первую тренировку',
        'Алғашқы жаттығуға дайындалуға көмектесемін',
        'I will help you prepare for your first workout',
    ),
    'context_choice': (
        'Выбери свой профиль или демо-пример',
        'Өз профиліңді немесе демо үлгіні таңда',
        'Choose your profile or a demo input',
    ),
    'plan_generating': (
        'Готовлю план по подтверждённым данным',
        'Расталған деректерден жоспар дайындаймын',
        'Preparing a plan from your confirmed data',
    ),
    'plan_ready': (
        'План готов. Посмотри упражнения',
        'Жоспар дайын. Жаттығуларды қара',
        'Your plan is ready. Review the exercises',
    ),
    'camera_permission': (
        'Нажми кнопку и разреши камеру в браузере',
        'Түймені басып, браузерде камераға рұқсат бер',
        'Press the button and allow camera access in your browser',
    ),
    'gesture_point': (
        'Наводи указательным пальцем',
        'Сұқ саусағыңмен бағытта',
        'Point with your index finger',
    ),
    'gesture_pinch': (
        'Соедини большой и указательный пальцы для выбора',
        'Таңдау үшін бас және сұқ саусақты қос',
        'Pinch your thumb and index finger to select',
    ),
    'gesture_fist': (
        'Покажи кулак, чтобы вернуться',
        'Қайту үшін жұдырық көрсет',
        'Make a fist to go back',
    ),
    'gesture_thumb': (
        'Большой палец вверх — подтвердить',
        'Растау үшін бас бармақты көтер',
        'Thumbs up to confirm',
    ),
    'tracking_recovery': (
        'Вернись в кадр и займи исходное положение',
        'Кадрға оралып, бастапқы қалыпқа тұр',
        'Return into view and stand in your starting position',
    ),
    'stop': ('Остановись и сделай паузу', 'Тоқтап, үзіліс жаса', 'Stop and take a break'),
    'countdown_3': ('Три', 'Үш', 'Three'),
    'countdown_2': ('Два', 'Екі', 'Two'),
    'countdown_1': ('Один', 'Бір', 'One'),
    'start': ('Начали', 'Баста', 'Start'),
    'good_rep': ('Хорошее повторение', 'Жақсы қайталау', 'Good repetition'),
    'set_complete': ('Подход завершён', 'Сет аяқталды', 'Set complete'),
    'rest': ('Отдых. Следи за таймером', 'Демал. Таймерді бақыла', 'Rest. Follow the timer'),
    'next_exercise': (
        'Перейдём к следующему упражнению',
        'Келесі жаттығуға өтейік',
        'Move to the next exercise',
    ),
    'workout_complete': (
        'Тренировка завершена. Посмотри результаты',
        'Жаттығу аяқталды. Нәтижені қара',
        'Workout complete. Review your results',
    ),
    'depth_insufficient': ('Опустись немного ниже', 'Сәл төмен түс', 'Lower a little more'),
    'too_fast': ('Медленнее вниз', 'Төменге баяуырақ', 'Lower more slowly'),
    'incomplete_extension': ('Заверши подъём', 'Толық көтеріл', 'Finish standing up'),
}
PREVIEW = (
    'Это пример выбранного голоса. Начнём спокойно и с контролем.',
    'Бұл таңдалған дауыстың үлгісі. Асықпай, бақылаумен бастайық.',
    'This is a sample of your selected voice. Let us begin with control.',
)
LANG_INDEX = {'ru': 0, 'kk': 1, 'en': 2}
_cache: collections.OrderedDict[str, tuple[float, bytes]] = collections.OrderedDict()
_cache_bytes = 0
_gate: asyncio.Semaphore | None = None
_gate_loop = None


async def budget(user_id, category, units, limit):
    try:
        await models.coach.budget_take(str(user_id), category, units, limit)
    except models.BudgetExceeded as exc:
        raise exceptions.HTTPTooManyRequestsException(
            detail='Daily provider budget reached', status='budget', retry_after=86400
        ) from exc


async def limit_ip(request: fastapi.Request) -> None:
    # Never trust spoofable X-Forwarded-For without an explicit proxy topology.
    peer = request.client.host if request.client else 'unknown'
    scope = 'ip:' + payload_hash({'peer': peer})
    await budget(scope, 'requests', 1, config.get_settings().PROVIDER_IP_DAILY_REQUEST_CAP)


def provider_error(exc):
    return exceptions.HTTPServiceUnavailableException(
        detail='Speech provider unavailable', status=str(exc) or 'network'
    )


async def get_preferences(current_user: schemas.UserCurrent) -> dict:
    return await models.coach.preferences_get(current_user.id)


async def replace_preferences(
    current_user: schemas.UserCurrent, body: schemas.coach.CoachPreferencesUpdate
) -> dict:
    if body.voice_id:
        try:
            if not await elevenlabs.voice_allowed(body.voice_id):
                raise elevenlabs.SpeechUnavailable('voice_unavailable')
            await elevenlabs.validate_model(body.language)
        except elevenlabs.SpeechUnavailable as exc:
            raise provider_error(exc) from exc
    if body.audio_enabled and not body.voice_id:
        raise exceptions.HTTPBadRequestException(detail='Select an available voice first')
    return await models.coach.preferences_replace(
        current_user.id, body.model_dump(mode='json')
    )


async def list_voices(
    current_user: schemas.UserCurrent,
    language: str,
    page_size: int,
    next_page_token: str | None,
) -> dict:
    try:
        model = await elevenlabs.validate_model(language)
        return {
            **await elevenlabs.voices(page_size, next_page_token),
            'model_id': model,
            'language': language,
        }
    except elevenlabs.SpeechUnavailable as exc:
        raise provider_error(exc) from exc


async def list_models() -> dict:
    try:
        return {'models': await elevenlabs.models()}
    except elevenlabs.SpeechUnavailable as exc:
        raise provider_error(exc) from exc


async def audio(
    current_user: schemas.UserCurrent, text: str, preferences: dict, version: str
) -> dict:
    global _cache_bytes, _gate, _gate_loop
    if not preferences['voice_id']:
        raise exceptions.HTTPServiceUnavailableException(
            detail='Choose a voice', status='voice_required'
        )
    settings = config.get_settings()
    key = payload_hash(
        {
            'owner': str(current_user.id),
            'voice': preferences['voice_id'],
            'model': elevenlabs.model_for(preferences['language']),
            'language': preferences['language'],
            'style': preferences['style'],
            'text': text,
            'version': version,
            'format': settings.ELEVENLABS_OUTPUT_FORMAT,
        }
    )
    now = time.monotonic()
    for stale, (expires, data) in list(_cache.items()):
        if expires <= now:
            _cache_bytes -= len(data)
            del _cache[stale]
    if key in _cache:
        _cache.move_to_end(key)
        return {'audio': _cache[key][1], 'cache': 'hit'}
    loop = asyncio.get_running_loop()
    if _gate is None or _gate_loop is not loop:
        _gate = asyncio.Semaphore(settings.ELEVENLABS_MAX_CONCURRENCY)
        _gate_loop = loop
    async with _gate:
        if key in _cache:
            return {'audio': _cache[key][1], 'cache': 'hit'}
        await budget(current_user.id, 'tts', len(text), settings.AUDIO_DAILY_CHARACTER_CAP)
        try:
            data = await elevenlabs.synthesize(
                preferences['voice_id'], text, preferences['language'], preferences['style']
            )
        except elevenlabs.SpeechUnavailable as exc:
            raise provider_error(exc) from exc
        max_bytes = settings.AUDIO_CACHE_MAX_MB * 1024 * 1024
        while _cache and _cache_bytes + len(data) > max_bytes:
            _, (_, old) = _cache.popitem(last=False)
            _cache_bytes -= len(old)
        if len(data) <= max_bytes:
            _cache[key] = (time.monotonic() + settings.PERSONAL_AUDIO_TTL_SECONDS, data)
            _cache_bytes += len(data)
        return {'audio': data, 'cache': 'miss'}


def binary(result: dict) -> fastapi.Response:
    return fastapi.Response(
        content=result['audio'],
        media_type='audio/mpeg',
        headers={
            'Cache-Control': 'private, no-store',
            'X-Audio-Cache': result['cache'],
            'X-Speech-Provider': 'elevenlabs',
        },
    )


async def preview(
    current_user: schemas.UserCurrent, voice_id: str, body: schemas.speech.PreviewCreate
) -> fastapi.Response:
    return binary(
        await audio(
            current_user,
            PREVIEW[LANG_INDEX[body.language]],
            {'voice_id': voice_id, **body.model_dump(mode='json')},
            'preview-v1',
        )
    )


async def resolve(
    current_user: schemas.UserCurrent, body: schemas.speech.SpeechCreate, language: str
) -> tuple[str, str]:
    if body.message_id:
        try:
            message = await models.coach.message_get(current_user.id, body.message_id)
        except models.CoachNotFound as exc:
            raise exceptions.HTTPNotFoundException(detail='Message not found') from exc
        return message['answer']['speech_text'], 'message:' + str(body.message_id)
    if body.exercise_key:
        try:
            row = await models.ai_coach.spec_revision_get(
                current_user.id, body.exercise_key, body.spec_revision
            )
        except models.AISourceNotFound as exc:
            raise exceptions.HTTPNotFoundException(detail='Spec revision not found') from exc
        spec = row['movement_spec']
        if not spec:
            raise exceptions.HTTPNotFoundException(detail='Spec cue unavailable')
        groups = {'error:' + rule['code']: rule['messages'] for rule in spec['error_rules']}
        groups.update({'phase:' + phase['id']: phase['messages'] for phase in spec['phases']})
        groups.update(
            {key: value['messages'] for key, value in spec['coach_messages'].items()}
        )
        groups['calibration'] = spec['calibration']['messages']
        messages = groups.get(body.cue_id)
        if not messages:
            raise exceptions.HTTPNotFoundException(detail='Cue unavailable')
        return messages.get(language) or messages.get('ru') or messages.get('en'), str(
            body.spec_revision
        )
    if body.cue_id not in CUES:
        raise exceptions.HTTPNotFoundException(detail='Cue unavailable')
    return CUES[body.cue_id][LANG_INDEX[language]], 'static-cues-v1'


async def speak(
    current_user: schemas.UserCurrent, body: schemas.speech.SpeechCreate
) -> fastapi.Response:
    prefs = await get_preferences(current_user)
    text, version = await resolve(current_user, body, prefs['language'])
    return binary(await audio(current_user, text, prefs, version))


async def prewarm(
    current_user: schemas.UserCurrent, body: schemas.speech.PrewarmCreate
) -> dict:
    prepared, failed = [], []
    for cue in dict.fromkeys(body.cue_ids):
        try:
            await speak(
                current_user,
                schemas.speech.SpeechCreate(
                    cue_id=cue,
                    exercise_key=body.exercise_key,
                    spec_revision=body.spec_revision,
                ),
            )
            prepared.append(cue)
        except (exceptions.AppException, ValueError):
            failed.append(cue)
    return {'prepared': prepared, 'failed': failed}


async def transcribe(
    current_user: schemas.UserCurrent,
    file: fastapi.UploadFile,
    language: str,
    duration_seconds: float,
) -> dict:
    settings = config.get_settings()
    try:
        if (
            file.content_type
            not in {
                'audio/webm',
                'audio/ogg',
                'audio/wav',
                'audio/x-wav',
                'audio/mpeg',
                'audio/mp4',
                'video/webm',
            }
            or not 0 < duration_seconds <= settings.VOICE_INPUT_MAX_SECONDS
        ):
            raise exceptions.HTTPBadRequestException(
                detail='Unsupported audio or recording duration', status='invalid_audio'
            )
        data = await file.read(settings.VOICE_INPUT_MAX_BYTES + 1)
        if not data or len(data) > settings.VOICE_INPUT_MAX_BYTES:
            raise exceptions.HTTPBadRequestException(
                detail='Audio exceeds allowed size', status='invalid_audio'
            )
        await budget(current_user.id, 'transcribe', 1, settings.COACH_DAILY_REQUEST_CAP)
        extension = {
            'audio/webm': 'webm',
            'video/webm': 'webm',
            'audio/ogg': 'ogg',
            'audio/wav': 'wav',
            'audio/x-wav': 'wav',
            'audio/mpeg': 'mp3',
            'audio/mp4': 'mp4',
        }[file.content_type]
        try:
            text = await openai.transcribe(data, 'recording.' + extension, language)
        except openai.AIProviderUnavailable as exc:
            raise exceptions.HTTPServiceUnavailableException(
                detail='Transcription unavailable', status=str(exc) or 'network'
            ) from exc
        return {
            'text': text,
            'provenance': {
                'provider': 'openai',
                'model_used': settings.OPENAI_TRANSCRIBE_MODEL,
            },
        }
    finally:
        await file.close()


def capabilities() -> dict:
    settings = config.get_settings()

    def row(enabled, available, model=None):
        return {
            'configured': available,
            'disabled': not enabled,
            'unavailable': not available,
            'last_check': None,
            'model': model,
        }

    return {
        'openai': row(
            settings.AI_FEATURE_ENABLED, settings.ai_available, settings.OPENAI_MODEL
        ),
        'elevenlabs': row(settings.ELEVENLABS_ENABLED, settings.elevenlabs_available),
        'transcription': row(
            settings.VOICE_INPUT_ENABLED,
            settings.ai_available and settings.VOICE_INPUT_ENABLED,
            settings.OPENAI_TRANSCRIBE_MODEL,
        ),
        'google': row(settings.GOOGLE_CALENDAR_ENABLED, settings.google_available),
        'execution_mode': settings.COACH_EXECUTION_MODE,
    }
