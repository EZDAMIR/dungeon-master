"""Official protocol mocks: no paid API calls in ordinary suites."""

import datetime
import json
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock
from unittest.mock import MagicMock

import httpx
import pytest

from src.ai import elevenlabs
from src.ai import openai
from src.api import schemas
from src.api.controllers import demo_personas
from src.api.webhooks import google_calendar
from src.core import config
from src.core import http_client

MP3 = b'ID3' + b'\0' * 64
MODEL = {
    'model_id': 'eleven_flash_v2_5',
    'name': 'Flash',
    'can_do_text_to_speech': True,
    'languages': [
        {'language_id': 'ru', 'name': 'Russian'},
        {'language_id': 'en', 'name': 'English'},
    ],
}
VOICE = {
    'voice_id': 'actual-test-voice',
    'name': 'Account voice',
    'description': 'Account test',
    'labels': {'language': 'ru'},
}


@pytest.fixture
def provider_settings(monkeypatch):
    monkeypatch.setenv('AI_FEATURE_ENABLED', 'true')
    monkeypatch.setenv('OPENAI_API_KEY', 'synthetic-mocked-key')
    monkeypatch.setenv('ELEVENLABS_API_KEY', 'synthetic-mocked-key')
    config.clear_settings_cache()
    monkeypatch.setattr(openai, '_client', None)
    monkeypatch.setattr(openai, '_client_key', None)


@pytest.fixture
def transport(monkeypatch, provider_settings):
    clients = []
    calls = []

    def setup(handler):
        def record(request):
            calls.append(request)
            return handler(request)

        client = httpx.AsyncClient(transport=httpx.MockTransport(record))
        clients.append(client)
        monkeypatch.setattr(http_client, 'get_client', lambda: client)
        return calls

    yield setup


async def test_real_voice_protocol_pagination_allowlist_and_mp3(transport, monkeypatch):
    def handler(request):
        if request.url.path == '/v1/models':
            return httpx.Response(200, json=[MODEL])
        if request.url.path == '/v2/voices':
            assert request.headers['xi-api-key'] == 'synthetic-mocked-key'
            return httpx.Response(
                200,
                json={
                    'voices': [] if 'next_page_token' not in request.url.params else [VOICE],
                    'has_more': 'next_page_token' not in request.url.params,
                    'next_page_token': 'page2',
                },
            )
        body = json.loads(request.content)
        assert body['language_code'] == 'ru' and body['model_id'] == 'eleven_flash_v2_5'
        assert 'optimize_streaming_latency' not in request.url.params
        return httpx.Response(200, content=MP3, headers={'content-type': 'audio/mpeg'})

    calls = transport(handler)
    assert await elevenlabs.voice_allowed(VOICE['voice_id'])
    assert await elevenlabs.synthesize(VOICE['voice_id'], 'test', 'ru', 'supportive') == MP3
    assert len(calls) == 6
    monkeypatch.setenv('ELEVENLABS_ALLOWED_VOICE_IDS', 'other')
    config.clear_settings_cache()
    assert not await elevenlabs.voice_allowed(VOICE['voice_id'])


@pytest.mark.parametrize(
    'code,category',
    [
        (401, 'invalid_key'),
        (403, 'quota'),
        (404, 'model_unavailable'),
        (429, 'rate_limit'),
        (500, 'network'),
    ],
)
async def test_elevenlabs_error_categories(transport, code, category):
    transport(
        lambda request: httpx.Response(code, json={'detail': 'private-provider-payload'})
    )
    with pytest.raises(elevenlabs.SpeechUnavailable, match=category):
        await elevenlabs.models()


@pytest.mark.parametrize(
    'content,media',
    [
        (b'', 'audio/mpeg'),
        (b'{}', 'application/json'),
        (b'x' * 40, 'audio/mpeg'),
        (MP3, 'text/plain'),
        (b'ID3' + b'x' * (5 * 1024 * 1024), 'audio/mpeg'),
    ],
    ids=['empty', 'json', 'invalid-mp3', 'wrong-media-type', 'oversized-mp3'],
)
async def test_json_empty_oversize_or_invalid_audio_never_success(transport, content, media):
    def handler(request):
        if request.url.path == '/v1/models':
            return httpx.Response(200, json=[MODEL])
        if request.url.path == '/v2/voices':
            return httpx.Response(200, json={'voices': [VOICE], 'has_more': False})
        return httpx.Response(200, content=content, headers={'content-type': media})

    transport(handler)
    with pytest.raises(elevenlabs.SpeechUnavailable, match='invalid_audio'):
        await elevenlabs.synthesize(VOICE['voice_id'], 'test', 'ru', 'calm')


async def test_kk_requires_actual_model_language_capability(transport, monkeypatch):
    transport(lambda request: httpx.Response(200, json=[MODEL]))
    with pytest.raises(elevenlabs.SpeechUnavailable, match='language_unavailable'):
        await elevenlabs.validate_model('kk')
    monkeypatch.setenv('ELEVENLABS_MODEL_KK', 'eleven_v3')
    config.clear_settings_cache()
    transport(
        lambda request: httpx.Response(
            200,
            json=[
                {
                    **MODEL,
                    'model_id': 'eleven_v3',
                    'languages': [{'language_id': 'kk', 'name': 'Kazakh'}],
                }
            ],
        )
    )
    assert await elevenlabs.validate_model('kk') == 'eleven_v3'


async def test_elevenlabs_schema_network_timeout_and_disabled(transport, monkeypatch):
    transport(lambda request: httpx.Response(200, json={}))
    with pytest.raises(elevenlabs.SpeechUnavailable, match='schema'):
        await elevenlabs.voices()
    with pytest.raises(elevenlabs.SpeechUnavailable, match='schema'):
        await elevenlabs.models()

    def timeout(request):
        raise httpx.ReadTimeout('private', request=request)

    transport(timeout)
    with pytest.raises(elevenlabs.SpeechUnavailable, match='timeout'):
        await elevenlabs.models()

    def network(request):
        raise httpx.ConnectError('private', request=request)

    transport(network)
    with pytest.raises(elevenlabs.SpeechUnavailable, match='network'):
        await elevenlabs.models()
    monkeypatch.setenv('ELEVENLABS_API_KEY', '')
    config.clear_settings_cache()
    with pytest.raises(elevenlabs.SpeechUnavailable, match='config'):
        await elevenlabs.models()


async def test_openai_reusable_client_store_budgets_and_reasoning(
    provider_settings, monkeypatch
):
    client = SimpleNamespace(
        close=AsyncMock(),
        responses=SimpleNamespace(parse=AsyncMock(), create=AsyncMock()),
        embeddings=SimpleNamespace(create=AsyncMock()),
        audio=SimpleNamespace(transcriptions=SimpleNamespace(create=AsyncMock())),
    )
    factory = MagicMock(return_value=client)
    monkeypatch.setattr(openai.sdk, 'AsyncOpenAI', factory)
    assert openai.get_client() is openai.get_client()
    assert factory.call_count == 1
    profile = demo_personas.deterministic_profile(
        {
            'additional_preferences': {},
            'self_description': 'Fitness',
            'preferred_coach_style': 'supportive',
            'preferred_language': 'ru',
        },
        {
            'confirmed_constraints': [],
            'session_minutes': 20,
            'days_per_week': 3,
            'goal': 'general_fitness',
            'experience_level': 'beginner',
            'equipment': ['none'],
        },
        [],
    )
    client.responses.parse.return_value = SimpleNamespace(
        status='completed',
        output_parsed=schemas.ai_coach.AIUserProfileV1.model_validate(profile),
    )
    assert (await openai.synthesize_user_profile({'reviewed_excerpt': 'confirmed words'}))[
        'summary'
    ] == 'Fitness'
    args = client.responses.parse.call_args.kwargs
    assert (
        args['model'] == 'gpt-5.4'
        and args['store'] is False
        and args['reasoning'] == {'effort': 'medium'}
    )
    assert args['max_output_tokens'] == 4000 and 'temperature' not in args
    assert 'confirmed words' in args['input'] and 'untrusted DATA' in args['instructions']
    client.audio.transcriptions.create.return_value = SimpleNamespace(text='hello')
    assert await openai.transcribe(b'bounded', 'clip.webm', 'ru') == 'hello'
    assert (
        client.audio.transcriptions.create.call_args.kwargs['model']
        == 'gpt-4o-mini-transcribe'
    )
    client.audio.transcriptions.create.return_value = SimpleNamespace(text='')
    with pytest.raises(openai.AIProviderUnavailable, match='schema'):
        await openai.transcribe(b'', 'clip.webm', 'ru')
    client.responses.parse.return_value = SimpleNamespace(
        status='incomplete', output_parsed=None
    )
    with pytest.raises(openai.AIProviderUnavailable, match='refusal_or_incomplete'):
        await openai.synthesize_user_profile({})
    client.responses.create.return_value = SimpleNamespace(status='incomplete')
    with pytest.raises(openai.AIProviderUnavailable, match='incomplete'):
        await openai.generate_movement_spec({}, profile)
    await openai.on_shutdown()
    client.close.assert_awaited_once()
    assert openai._client is None


async def test_coach_adapter_tools_and_strict_answer(provider_settings, monkeypatch):
    message = {
        'display_text': 'Ready',
        'speech_text': 'Ready',
        'source_references': [],
        'ui_actions': [],
    }
    fake = SimpleNamespace(
        type='function_call',
        name='get_active_plan',
        arguments='{}',
        call_id='call1',
        model_dump=lambda **kwargs: {
            'type': 'function_call',
            'call_id': 'call1',
            'arguments': '{}',
            'name': 'get_active_plan',
        },
    )
    client = SimpleNamespace(
        responses=SimpleNamespace(
            create=AsyncMock(
                return_value=SimpleNamespace(status='completed', output=[fake], output_text='')
            )
        )
    )
    monkeypatch.setattr(openai, 'get_client', lambda: client)
    result = await openai.coach_response([], [], 'instruction')
    assert result['calls'][0]['name'] == 'get_active_plan' and result['answer'] is None
    client.responses.create.return_value = SimpleNamespace(
        status='completed', output=[], output_text=json.dumps(message)
    )
    assert (await openai.coach_response([], [], 'instruction'))['answer'] == message
    args = client.responses.create.call_args.kwargs
    assert (
        args['store'] is False
        and args['reasoning'] == {'effort': 'low'}
        and not args['parallel_tool_calls']
    )
    client.responses.create.return_value = SimpleNamespace(
        status='completed', output=[], output_text='not JSON'
    )
    with pytest.raises(openai.AIProviderUnavailable, match='schema'):
        await openai.coach_response([], [], 'instruction')


def test_openai_sanitized_error_mapping():
    req = httpx.Request('POST', 'https://api.openai.com')
    assert (
        openai.category(
            openai.sdk.AuthenticationError(
                'private', response=httpx.Response(401, request=req), body={}
            )
        )
        == 'invalid_key'
    )
    assert (
        openai.category(
            openai.sdk.RateLimitError(
                'private',
                response=httpx.Response(429, request=req),
                body={'code': 'insufficient_quota'},
            )
        )
        == 'quota'
    )
    assert (
        openai.category(
            openai.sdk.RateLimitError(
                'private', response=httpx.Response(429, request=req), body={}
            )
        )
        == 'rate_limit'
    )
    assert (
        openai.category(
            openai.sdk.NotFoundError(
                'private', response=httpx.Response(404, request=req), body={}
            )
        )
        == 'model_unavailable'
    )
    assert openai.category(TimeoutError()) == 'timeout'
    assert openai.category(ValueError()) == 'schema'
    assert openai.category(RuntimeError()) == 'network'


async def test_google_protocol_oauth_freebusy_insert_timeout_reconciliation_update_delete(
    transport, monkeypatch
):
    monkeypatch.setenv('GOOGLE_CLIENT_ID', 'mock-client')
    monkeypatch.setenv('GOOGLE_CLIENT_SECRET', 'mock-secret')
    monkeypatch.setenv(
        'GOOGLE_REDIRECT_URI', 'http://localhost:8001/api/v1/integrations/google/callback'
    )
    config.clear_settings_cache()
    url = google_calendar.authorize_url('state')
    assert (
        'access_type=offline' in url
        and 'calendar.freebusy' in url
        and 'calendar.events' in url
    )
    appointment = {
        'id': uuid.uuid4(),
        'title': 'Practice',
        'starts_at': datetime.datetime.now(datetime.UTC),
        'ends_at': datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=20),
        'status': 'planned',
    }
    event = {
        'id': appointment['id'].hex,
        'etag': 'etag1',
        'extendedProperties': {'private': {'dm_appointment': str(appointment['id'])}},
    }

    def handler(request):
        if request.url.path == '/token':
            assert b'client_secret=mock-secret' in request.content
            return httpx.Response(
                200,
                json={
                    'access_token': 'mock-access',
                    'refresh_token': 'mock-refresh',
                    'expires_in': 3600,
                },
            )
        if request.url.path.endswith('/freeBusy'):
            assert json.loads(request.content)['items'] == [{'id': 'primary'}]
            return httpx.Response(
                200,
                json={
                    'calendars': {
                        'primary': {
                            'busy': [
                                {
                                    'start': '2026-10-01T10:00:00Z',
                                    'end': '2026-10-01T11:00:00Z',
                                }
                            ]
                        }
                    }
                },
            )
        if request.method == 'POST' and request.url.path.endswith('/events'):
            raise httpx.ReadTimeout('private', request=request)
        if request.method == 'PUT':
            assert request.headers['if-match'] == 'etag1'
            assert json.loads(request.content).get('attendees') is None
            return httpx.Response(200, json=event)
        if request.method == 'DELETE':
            return httpx.Response(204)
        if request.url.path == '/revoke':
            return httpx.Response(200)
        return httpx.Response(200, json=event)

    calls = transport(handler)
    assert (await google_calendar.token(code='mock-code'))['access_token'] == 'mock-access'
    assert (await google_calendar.token(refresh_token='mock-refresh'))[
        'refresh_token'
    ] == 'mock-refresh'
    assert (
        await google_calendar.freebusy(
            'mock-access', appointment['starts_at'], appointment['ends_at']
        )
    )[0]['starts_at'].tzinfo
    inserted = await google_calendar.event_sync('mock-access', appointment, None)
    assert inserted['event_id'] == appointment['id'].hex
    assert (await google_calendar.event_sync('mock-access', appointment, inserted))[
        'etag'
    ] == 'etag1'
    assert (
        await google_calendar.event_sync(
            'mock-access', {**appointment, 'status': 'cancelled'}, inserted
        )
    )['deleted']
    assert (
        await google_calendar.event_sync(
            'mock-access', {**appointment, 'status': 'skipped'}, None
        )
    )['deleted']
    await google_calendar.revoke('mock-refresh')
    assert all(
        'sendUpdates=none' in str(req.url)
        for req in calls
        if req.method in {'PUT', 'DELETE'} and '/events' in req.url.path
    )


@pytest.mark.parametrize(
    'code,category',
    [
        (401, 'revoked'),
        (403, 'forbidden'),
        (404, 'not_found'),
        (409, 'exists'),
        (412, 'stale'),
        (429, 'rate_limit'),
        (500, 'network'),
    ],
)
async def test_google_typed_sanitized_http_errors(transport, code, category):
    transport(lambda request: httpx.Response(code, json={'private': 'secret'}))
    with pytest.raises(google_calendar.CalendarUnavailable, match=category):
        await google_calendar.event_get('mock-access', 'id')


async def test_google_schema_foreign_event_network_and_invalid_token(transport):
    transport(lambda request: httpx.Response(200, json={}))
    with pytest.raises(google_calendar.CalendarUnavailable, match='schema'):
        await google_calendar.token(code='code')
    with pytest.raises(google_calendar.CalendarUnavailable, match='schema'):
        await google_calendar.freebusy(
            'access', datetime.datetime.now(datetime.UTC), datetime.datetime.now(datetime.UTC)
        )
    appointment = {
        'id': uuid.uuid4(),
        'status': 'planned',
        'title': 'T',
        'starts_at': datetime.datetime.now(datetime.UTC),
        'ends_at': datetime.datetime.now(datetime.UTC),
    }
    with pytest.raises(google_calendar.CalendarUnavailable, match='foreign_event'):
        await google_calendar.event_sync('access', appointment, {'event_id': 'id'})

    def broken(request):
        raise httpx.ConnectError('private', request=request)

    transport(broken)
    with pytest.raises(google_calendar.CalendarUnavailable, match='network'):
        await google_calendar.event_get('access', 'id')
