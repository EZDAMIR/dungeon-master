"""Narrow authenticated account voice/model/TTS adapter; never returns error JSON as audio."""

import httpx

from ..core import config
from ..core import http_client


class SpeechUnavailable(Exception):
    pass


async def request(method: str, path: str, **kwargs) -> httpx.Response:
    settings = config.get_settings()
    if not settings.elevenlabs_available:
        raise SpeechUnavailable('config')
    try:
        response = await http_client.get_client().request(
            method,
            'https://api.elevenlabs.io' + path,
            headers={'xi-api-key': settings.ELEVENLABS_API_KEY.get_secret_value()},
            timeout=settings.ELEVENLABS_TIMEOUT_SECONDS,
            **kwargs,
        )
        if response.status_code != 200:
            code = {
                401: 'invalid_key',
                403: 'quota',
                429: 'rate_limit',
                404: 'model_unavailable',
            }.get(response.status_code, 'network')
            raise SpeechUnavailable(code)
        return response
    except (httpx.TimeoutException, TimeoutError) as exc:
        raise SpeechUnavailable('timeout') from exc
    except httpx.HTTPError as exc:
        raise SpeechUnavailable('network') from exc


async def voices(page_size: int = 6, next_page_token: str | None = None) -> dict:
    params = {'page_size': page_size, 'include_total_count': False}
    if next_page_token:
        params['next_page_token'] = next_page_token
    try:
        body = (await request('GET', '/v2/voices', params=params)).json()
        allowed = {
            value.strip()
            for value in config.get_settings().ELEVENLABS_ALLOWED_VOICE_IDS.split(',')
            if value.strip()
        }
        rows = [
            {
                'voice_id': row['voice_id'],
                'name': row['name'],
                'description': row.get('description') or '',
                'labels': {str(k): str(v) for k, v in (row.get('labels') or {}).items()},
            }
            for row in body['voices']
            if not allowed or row['voice_id'] in allowed
        ]
        return {
            'voices': rows,
            'has_more': bool(body['has_more']),
            'next_page_token': body.get('next_page_token'),
        }
    except (KeyError, ValueError, TypeError) as exc:
        raise SpeechUnavailable('schema') from exc


async def models() -> list[dict]:
    try:
        rows = (await request('GET', '/v1/models')).json()
        if not isinstance(rows, list) or not rows:
            raise SpeechUnavailable('schema')
        return [
            {
                'model_id': row['model_id'],
                'name': row['name'],
                'languages': row['languages'],
                'can_do_text_to_speech': row['can_do_text_to_speech'],
            }
            for row in rows
        ]
    except (KeyError, ValueError, TypeError) as exc:
        raise SpeechUnavailable('schema') from exc


async def voice_allowed(voice_id: str) -> bool:
    token = None
    # Account voices only; bounded pagination to prevent unbounded provider work.
    for _ in range(10):
        page = await voices(100, token)
        if any(row['voice_id'] == voice_id for row in page['voices']):
            return True
        if not page['has_more'] or not page['next_page_token']:
            break
        token = page['next_page_token']
    return False


def model_for(language: str) -> str:
    return getattr(config.get_settings(), 'ELEVENLABS_MODEL_' + language.upper())


async def validate_model(language: str) -> str:
    model_id = model_for(language)
    model = next((row for row in await models() if row['model_id'] == model_id), None)
    if (
        not model
        or not model['can_do_text_to_speech']
        or language not in {row['language_id'] for row in model['languages']}
    ):
        raise SpeechUnavailable('language_unavailable')
    return model_id


async def synthesize(voice_id: str, text: str, language: str, style: str) -> bytes:
    if not await voice_allowed(voice_id):
        raise SpeechUnavailable('voice_unavailable')
    model_id = await validate_model(language)
    # Stability exists in the current model contract; v3 supports .0/.5/1 only.
    stability = {'calm': 1.0, 'supportive': 0.5, 'energetic': 0.0, 'strict': 0.5}[style]
    response = await request(
        'POST',
        '/v1/text-to-speech/' + voice_id,
        params={'output_format': config.get_settings().ELEVENLABS_OUTPUT_FORMAT},
        json={
            'text': text,
            'model_id': model_id,
            'language_code': language,
            'voice_settings': {'stability': stability},
        },
    )
    if response.headers.get('content-type', '').split(';')[0] not in {
        'audio/mpeg',
        'audio/mp3',
    }:
        raise SpeechUnavailable('invalid_audio')
    data = response.content
    if (
        len(data) < 16
        or len(data) > 5 * 1024 * 1024
        or not (data.startswith(b'ID3') or (data[0] == 255 and data[1] & 224 == 224))
    ):
        raise SpeechUnavailable('invalid_audio')
    return data
