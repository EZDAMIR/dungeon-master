"""Full Sprint4B API/persistence regression against a fresh disposable database."""

import asyncio
import copy
import datetime
import json
import uuid
from unittest.mock import AsyncMock

import fastapi
import pydantic
import pytest

from src.ai import elevenlabs
from src.ai import openai
from src.api import controllers
from src.api import exceptions
from src.api import models
from src.api import schemas
from src.api.controllers import coach
from src.api.controllers import generation_jobs
from src.api.controllers import guest_sessions
from src.api.controllers import schedule
from src.api.controllers import speech
from src.api.services import generation_jobs as job_service
from src.core import config
from src.core import security
from tests.test_release_providers import MODEL
from tests.test_release_providers import MP3
from tests.test_release_providers import VOICE

pytestmark = pytest.mark.xdist_group('domains')


@pytest.mark.parametrize(
    'kind,source_id,completed_sessions,accepted',
    [
        (None, None, 0, True),
        ('profile', None, 0, True),
        ('preferences', None, 0, True),
        ('profile', '00000000-0000-4000-8000-000000000001', 0, False),
        ('preferences', '00000000-0000-4000-8000-000000000001', 0, False),
        ('document', '00000000-0000-4000-8000-000000000001', 0, True),
        ('document', '00000000-0000-4000-8000-000000000002', 0, False),
        ('document', None, 0, False),
        ('progress', None, 0, False),
        ('progress', '00000000-0000-4000-8000-000000000001', 0, False),
        ('progress', None, 1, True),
        ('progress', '00000000-0000-4000-8000-000000000001', 1, True),
        ('progress', '00000000-0000-4000-8000-000000000002', 1, False),
    ],
)
async def test_coach_prompt_keeps_strict_source_acceptance(
    monkeypatch,
    kind,
    source_id,
    completed_sessions,
    accepted,
):
    owner = schemas.UserCurrent(id=uuid.uuid4(), email=None)
    owned_id = uuid.UUID('00000000-0000-4000-8000-000000000001')
    references = (
        [] if kind is None else [{'type': kind, 'label': 'Source', 'source_id': source_id}]
    )
    answer = schemas.coach.CoachAnswer.model_validate_json(
        json.dumps(
            {
                'display_text': 'Grounded answer',
                'speech_text': 'Grounded answer',
                'source_references': references,
                'ui_actions': [],
            },
        ),
    ).model_dump(mode='json')
    monkeypatch.setattr(
        coach.models.coach, 'message_by_operation', AsyncMock(return_value=None)
    )
    monkeypatch.setattr(coach.controllers.speech, 'budget', AsyncMock())
    monkeypatch.setattr(
        coach.models.coach,
        'conversation_ensure',
        AsyncMock(return_value={'id': uuid.uuid4()}),
    )
    monkeypatch.setattr(
        coach,
        'context',
        AsyncMock(
            return_value={
                'sources': {'facts': [{'document_id': owned_id}]},
                'progress': {
                    'completed_sessions': completed_sessions,
                    'recent_sessions': [{'id': owned_id}] if completed_sessions else [],
                },
                'preferences': {'language': 'ru'},
                'revision': 'source-test-v1',
            },
        ),
    )
    provider = AsyncMock(return_value={'answer': answer, 'calls': [], 'output': []})
    monkeypatch.setattr(openai, 'coach_response', provider)

    async def save_message(user_id, data):
        assert user_id == owner.id
        return data

    monkeypatch.setattr(coach.models.coach, 'message_save', save_message)
    monkeypatch.setenv('COACH_EXECUTION_MODE', 'live')
    config.clear_settings_cache()
    result = await coach.turn(
        owner,
        schemas.coach.CoachTurn(
            operation_id=uuid.uuid4(),
            conversation_id=None,
            text='Explain my plan',
            screen='planning',
            exercise_key=None,
        ),
    )
    assert result['provenance']['prompt_version'] == 'coach-v3'
    assert provider.await_args.args[2] == coach.INSTRUCTIONS
    if accepted:
        assert result['provenance']['execution_mode'] == 'live'
        assert result['error_category'] is None
        assert result['source_references'] == references
        assert result['display_text'] == 'Grounded answer'
    else:
        assert result['provenance']['execution_mode'] == 'fallback'
        assert result['error_category'] == 'schema'
        assert result['source_references'] == []
        assert 'Grounded answer' not in result['display_text']


@pytest.fixture(autouse=True)
def isolated_clients(monkeypatch):
    monkeypatch.setattr(openai, '_client', None)
    monkeypatch.setattr(openai, '_client_key', None)
    monkeypatch.setattr(speech, '_cache', {})
    import collections

    monkeypatch.setattr(speech, '_cache', collections.OrderedDict())
    monkeypatch.setattr(speech, '_cache_bytes', 0)
    config.clear_settings_cache()


async def post(client, path, payload, headers, status=200):
    response = await client.post('/api/v1' + path, json=payload, headers=headers)
    assert response.status_code == status, response.text
    return response.json()


async def preferences_all_week(client, headers):
    data = {
        'timezone': 'Asia/Almaty',
        'duration_minutes': 20,
        'availability': [
            {'weekday': day, 'start_minute': 0, 'end_minute': 1440} for day in range(7)
        ],
        'expected_revision': 0,
    }
    response = await client.put('/api/v1/schedule/preferences', json=data, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


async def proposal_at_first_slot(client, headers, revision=1):
    data = (await client.get('/api/v1/schedule', headers=headers)).json()
    payload = {
        'operation_id': str(uuid.uuid4()),
        'expected_revision': revision,
        'action': 'create',
        'appointment_id': None,
        'starts_at': data['slots'][0]['starts_at'],
        'duration_minutes': 20,
        'title': 'Practice',
        'plan_id': None,
    }
    proposal = await post(client, '/schedule/proposals', payload, headers)
    return proposal, payload


async def test_guest_cookie_refresh_race_revocation_legacy_and_csrf(client, guest, database):
    headers, user_id = guest
    original = client.cookies.get('dm_refresh')
    assert original
    assert (await client.post('/api/v1/auth/refresh', json={})).status_code == 403
    await post(client, '/auth/refresh', {}, {'Origin': 'https://evil.invalid'}, 403)
    raceheaders = {'Origin': 'http://test', 'Cookie': 'dm_refresh=' + original}
    responses = await asyncio.gather(
        *(client.post('/api/v1/auth/refresh', json={}, headers=raceheaders) for _ in range(2))
    )
    assert all(response.status_code == 200 for response in responses)
    assert all(response.json()['user']['id'] == user_id for response in responses)
    secrets = [response.cookies.get('dm_refresh') for response in responses]
    assert secrets[0] == secrets[1] != original
    async with database.connect() as conn:
        rows = (
            (
                await conn.execute(
                    models.guest_sessions.GuestSessions.select().where(
                        models.guest_sessions.GuestSessions.c.user_id == uuid.UUID(user_id)
                    )
                )
            )
            .mappings()
            .all()
        )
    assert all(
        original not in str(dict(row)) and secrets[0] not in str(dict(row)) for row in rows
    )
    token = security.create_access_token(
        {'id': user_id, 'email': None, 'permissions': []}, datetime.timedelta(seconds=-1)
    )
    assert (
        await client.get('/api/v1/auth/me', headers={'Authorization': 'Bearer ' + token})
    ).status_code == 401
    restored = await post(
        client,
        '/auth/refresh',
        {},
        {'Origin': 'http://test', 'Cookie': 'dm_refresh=' + secrets[0]},
    )
    assert restored['user']['id'] == user_id
    await post(client, '/auth/logout', {}, {'Origin': 'http://test'})
    await post(
        client,
        '/auth/refresh',
        {},
        {'Origin': 'http://test', 'Cookie': 'dm_refresh=' + secrets[0]},
        401,
    )
    bootstrapped = await post(client, '/auth/session', {}, headers)
    assert bootstrapped['user']['id'] == user_id
    await post(
        client, '/auth/refresh', {}, {'Origin': 'http://test', 'Cookie': 'dm_refresh=bad'}, 401
    )
    await post(
        client,
        '/auth/refresh',
        {},
        {'Origin': 'http://test', 'Cookie': 'dm_refresh=' + 'x' * 64},
        401,
    )
    response = fastapi.Response()
    guest_sessions.set_cookie(
        response,
        'local-test',
        datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=1),
    )
    assert (
        'HttpOnly' in response.headers['set-cookie']
        and 'SameSite=lax' in response.headers['set-cookie']
    )


async def test_internal_schedule_proposals_conflicts_owner_revision_and_ics(
    client, guest, database
):
    headers, _ = guest
    default = (await client.get('/api/v1/schedule/preferences', headers=headers)).json()
    assert default['revision'] == 0
    prefs = await preferences_all_week(client, headers)
    proposal, payload = await proposal_at_first_slot(client, headers)
    assert proposal['status'] == 'pending' and len(proposal['payload_hash']) == 64
    retry = await post(client, '/schedule/proposals', payload, headers)
    assert retry['id'] == proposal['id']
    changed = {**payload, 'title': 'Different'}
    await post(client, '/schedule/proposals', changed, headers, 409)
    other = (await client.post('/api/v1/auth/guest')).json()
    foreign = {'Authorization': 'Bearer ' + other['access_token']}
    path = '/coach/proposals/' + proposal['id'] + '/confirm'
    await post(client, path, {'operation_id': str(uuid.uuid4())}, foreign, 404)
    confirmed = await post(client, path, {'operation_id': str(uuid.uuid4())}, headers)
    assert confirmed['status'] == 'confirmed' and confirmed['result']['saved']
    again = await post(client, path, {'operation_id': str(uuid.uuid4())}, headers)
    assert again['result'] == confirmed['result']
    await post(client, '/schedule/proposals', payload, headers, 409)
    data = (await client.get('/api/v1/schedule', headers=headers)).json()
    assert data['revision'] == 2 and len(data['appointments']) == 1
    assert data['appointments'][0]['starts_at'] not in {
        slot['starts_at'] for slot in data['slots']
    }
    export = await client.get('/api/v1/schedule/export.ics', headers=headers)
    assert export.status_code == 200 and export.headers['content-type'].startswith(
        'text/calendar'
    )
    assert confirmed['result']['appointment_id'] + '@dungeon-master' in export.text
    assert 'DTSTART:' in export.text and 'X-WR-TIMEZONE:Asia/Almaty' in export.text
    conflict = {**payload, 'operation_id': str(uuid.uuid4()), 'expected_revision': 2}
    await post(client, '/schedule/proposals', conflict, headers, 409)
    move = {
        **conflict,
        'action': 'move',
        'appointment_id': confirmed['result']['appointment_id'],
        'starts_at': data['slots'][0]['starts_at'],
    }
    moveproposal = await post(client, '/schedule/proposals', move, headers)
    moved = await post(
        client,
        '/coach/proposals/' + moveproposal['id'] + '/confirm',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    assert moved['result']['revision'] == 3
    cancel = {
        **move,
        'operation_id': str(uuid.uuid4()),
        'action': 'cancel',
        'expected_revision': 3,
        'starts_at': None,
    }
    cancelproposal = await post(client, '/schedule/proposals', cancel, headers)
    await post(
        client,
        '/coach/proposals/' + cancelproposal['id'] + '/confirm',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    assert (await client.get('/api/v1/schedule', headers=headers)).json()['appointments'][0][
        'status'
    ] == 'cancelled'
    reject, _ = await proposal_at_first_slot(client, headers, 4)
    rejected = await post(
        client,
        '/coach/proposals/' + reject['id'] + '/reject',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    assert rejected['status'] == 'rejected'
    await post(
        client,
        '/coach/proposals/' + reject['id'] + '/reject',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    await post(
        client,
        '/coach/proposals/' + reject['id'] + '/confirm',
        {'operation_id': str(uuid.uuid4())},
        headers,
        409,
    )
    stale, _ = await proposal_at_first_slot(client, headers, 4)
    async with database.begin() as conn:
        await conn.execute(
            models.coach.CoachProposals.update()
            .where(models.coach.CoachProposals.c.id == uuid.UUID(stale['id']))
            .values(
                expires_at=datetime.datetime.now(datetime.UTC) - datetime.timedelta(seconds=1)
            )
        )
    await post(
        client,
        '/coach/proposals/' + stale['id'] + '/confirm',
        {'operation_id': str(uuid.uuid4())},
        headers,
        409,
    )
    await client.put(
        '/api/v1/schedule/preferences',
        json={**prefs, 'expected_revision': 1, 'revision': 1},
        headers=headers,
    )
    past = {
        **payload,
        'operation_id': str(uuid.uuid4()),
        'expected_revision': 4,
        'starts_at': '2020-01-01T12:00:00Z',
    }
    await post(client, '/schedule/proposals', past, headers, 400)
    missing = {
        **past,
        'action': 'move',
        'appointment_id': str(uuid.uuid4()),
        'starts_at': None,
    }
    await post(client, '/schedule/proposals', missing, headers, 422)
    assert (
        await client.get('/api/v1/schedule?starts_on=2000-01-01', headers=headers)
    ).status_code == 400


@pytest.mark.parametrize(
    'timezone,date,minute',
    [('America/New_York', '2026-03-08', 150), ('America/New_York', '2026-11-01', 90)],
)
def test_nonexistent_and_ambiguous_dst_times_never_normalized(timezone, date, minute):
    assert schedule.local_instant(datetime.date.fromisoformat(date), minute, timezone) is None


def test_schedule_strict_validation_and_slot_conflicts():
    for payload in [
        {'timezone': 'not/a-zone', 'duration_minutes': 20, 'availability': []},
        {
            'timezone': 'UTC',
            'duration_minutes': 20,
            'availability': [{'weekday': 0, 'start_minute': 100, 'end_minute': 90}],
        },
        {
            'timezone': 'UTC',
            'duration_minutes': 20,
            'availability': [
                {'weekday': 0, 'start_minute': 90, 'end_minute': 120},
                {'weekday': 0, 'start_minute': 100, 'end_minute': 130},
            ],
        },
    ]:
        with pytest.raises(pydantic.ValidationError):
            schemas.schedule.SchedulePreferencesBase.model_validate(payload)
    start = datetime.datetime(2026, 10, 5, 12, tzinfo=datetime.UTC)
    prefs = {
        'timezone': 'UTC',
        'duration_minutes': 20,
        'availability': [{'weekday': 0, 'start_minute': 720, 'end_minute': 800}],
    }
    busy = [
        {
            'status': 'planned',
            'starts_at': start,
            'ends_at': start + datetime.timedelta(minutes=30),
        }
    ]
    slots = schedule.available_slots(
        prefs, busy, start.date(), start - datetime.timedelta(seconds=1)
    )
    assert all(row['starts_at'] >= start + datetime.timedelta(minutes=30) for row in slots)


async def test_voice_preferences_audio_cache_authorization_languages_and_prewarm(
    client, guest, database, monkeypatch
):
    headers, user_id = guest
    synth = AsyncMock(return_value=MP3)
    monkeypatch.setattr(elevenlabs, 'synthesize', synth)
    monkeypatch.setattr(elevenlabs, 'voice_allowed', AsyncMock(return_value=True))
    monkeypatch.setattr(
        elevenlabs, 'validate_model', AsyncMock(return_value='eleven_flash_v2_5')
    )
    monkeypatch.setattr(elevenlabs, 'models', AsyncMock(return_value=[MODEL]))
    monkeypatch.setattr(
        elevenlabs,
        'voices',
        AsyncMock(
            return_value={'voices': [VOICE], 'has_more': True, 'next_page_token': 'page2'}
        ),
    )
    voices = await client.get('/api/v1/voices?language=ru', headers=headers)
    assert (
        voices.status_code == 200
        and voices.json()['voices'][0]['voice_id'] == VOICE['voice_id']
    )
    assert (await client.get('/api/v1/voices/models', headers=headers)).json()['models'][0][
        'model_id'
    ] == MODEL['model_id']
    prefs = {
        'voice_id': VOICE['voice_id'],
        'language': 'ru',
        'style': 'supportive',
        'audio_enabled': True,
    }
    response = await client.put('/api/v1/coach/preferences', json=prefs, headers=headers)
    assert response.status_code == 200 and response.json()['revision'] == 1
    assert (await client.get('/api/v1/coach/preferences', headers=headers)).json()[
        'voice_id'
    ] == VOICE['voice_id']
    preview = await client.post(
        '/api/v1/voices/' + VOICE['voice_id'] + '/preview',
        json={'language': 'ru', 'style': 'supportive'},
        headers=headers,
    )
    assert preview.content == MP3 and preview.headers['x-speech-provider'] == 'elevenlabs'
    for expected in ['miss', 'hit']:
        audio = await client.post(
            '/api/v1/speech', json={'cue_id': 'welcome'}, headers=headers
        )
        assert (
            audio.status_code == 200
            and audio.content == MP3
            and audio.headers['x-audio-cache'] == expected
        )
    assert synth.await_count == 2
    warmed = await post(
        client, '/speech/prewarm', {'cue_ids': ['welcome', 'start', 'no_such_cue']}, headers
    )
    assert warmed['prepared'] == ['welcome', 'start'] and warmed['failed'] == ['no_such_cue']
    assert (
        await client.post(
            '/api/v1/speech', json={'text': 'not a public proxy'}, headers=headers
        )
    ).status_code == 422
    await post(client, '/speech', {'message_id': str(uuid.uuid4())}, headers, 404)
    foreign = (await client.post('/api/v1/auth/guest')).json()
    foreign_headers = {'Authorization': 'Bearer ' + foreign['access_token']}
    await post(client, '/speech', {'cue_id': 'welcome'}, foreign_headers, 503)
    await client.put(
        '/api/v1/coach/preferences', json={**prefs, 'language': 'kk'}, headers=headers
    )
    await post(client, '/speech/prewarm', {'cue_ids': ['welcome']}, headers)
    assert synth.call_args.args[2] == 'kk'
    monkeypatch.setattr(elevenlabs, 'voice_allowed', AsyncMock(return_value=False))
    assert (
        await client.put('/api/v1/coach/preferences', json=prefs, headers=headers)
    ).status_code == 503
    assert (
        await client.put(
            '/api/v1/coach/preferences', json={**prefs, 'voice_id': None}, headers=headers
        )
    ).status_code == 400
    monkeypatch.setattr(
        elevenlabs, 'synthesize', AsyncMock(side_effect=elevenlabs.SpeechUnavailable('quota'))
    )
    await post(client, '/speech', {'cue_id': 'stop'}, headers, 503)
    async with database.begin() as conn:
        await conn.execute(
            models.coach.ProviderBudgets.insert().values(
                scope=user_id,
                day=datetime.datetime.now(datetime.UTC).date(),
                category='limited',
                used=1,
            )
        )
    with pytest.raises(exceptions.HTTPTooManyRequestsException):
        await speech.budget(user_id, 'limited', 1, 1)


async def test_coach_fallback_fixture_idempotency_private_speech_and_transcription(
    client, guest, database, monkeypatch
):
    headers, _ = guest
    turn = {
        'operation_id': str(uuid.uuid4()),
        'conversation_id': None,
        'text': 'What next?',
        'screen': 'planning',
        'exercise_key': None,
    }
    message = await post(client, '/coach/turns', turn, headers)
    assert (
        message['provenance']['execution_mode'] == 'fallback'
        and message['error_category'] == 'config'
    )
    cached = await post(client, '/coach/turns', turn, headers)
    assert cached['message_id'] == message['message_id'] and cached['provenance']['cached']
    await post(client, '/coach/turns', {**turn, 'text': 'Different'}, headers, 409)
    other = (await client.post('/api/v1/auth/guest')).json()
    foreign = {'Authorization': 'Bearer ' + other['access_token']}
    await post(
        client,
        '/coach/turns',
        {
            **turn,
            'operation_id': str(uuid.uuid4()),
            'conversation_id': message['conversation_id'],
        },
        foreign,
        404,
    )
    await post(client, '/speech', {'message_id': message['message_id']}, foreign, 404)
    monkeypatch.setattr(elevenlabs, 'synthesize', AsyncMock(return_value=MP3))
    await models.coach.preferences_replace(
        uuid.UUID(other['user']['id']),
        {
            'voice_id': 'account',
            'language': 'ru',
            'style': 'supportive',
            'audio_enabled': True,
        },
    )
    owner_id = security.decode_access_token(headers['Authorization'].split()[1])['id']
    await models.coach.preferences_replace(
        uuid.UUID(owner_id),
        {
            'voice_id': 'account',
            'language': 'ru',
            'style': 'supportive',
            'audio_enabled': True,
        },
    )
    audio = await client.post(
        '/api/v1/speech', json={'message_id': message['message_id']}, headers=headers
    )
    assert audio.status_code == 200 and audio.content == MP3
    monkeypatch.setenv('COACH_EXECUTION_MODE', 'fixture')
    config.clear_settings_cache()
    await post(
        client, '/coach/turns', {**turn, 'operation_id': str(uuid.uuid4())}, headers, 403
    )
    monkeypatch.setenv('ENABLE_FIXTURE_MODE', 'true')
    config.clear_settings_cache()
    fixture = await post(
        client, '/coach/turns', {**turn, 'operation_id': str(uuid.uuid4())}, headers
    )
    assert fixture['provenance']['execution_mode'] == 'fixture'
    monkeypatch.setattr(openai, 'transcribe', AsyncMock(return_value='Bounded spoken input'))
    recording = await client.post(
        '/api/v1/coach/transcribe',
        headers=headers,
        files={'file': ('input.webm', b'local audio', 'audio/webm')},
        data={'language': 'ru', 'duration_seconds': '5'},
    )
    assert (
        recording.status_code == 200
        and recording.json()['provenance']['model_used'] == 'gpt-4o-mini-transcribe'
    )
    for content, media, duration in [
        (b'x', 'image/png', '5'),
        (b'x', 'audio/webm', '31'),
        (b'', 'audio/webm', '5'),
        (b'x' * (4194305), 'audio/webm', '5'),
    ]:
        response = await client.post(
            '/api/v1/coach/transcribe',
            headers=headers,
            files={'file': ('input.webm', content, media)},
            data={'language': 'ru', 'duration_seconds': duration},
        )
        assert response.status_code == 400
    monkeypatch.setattr(
        openai, 'transcribe', AsyncMock(side_effect=openai.AIProviderUnavailable('timeout'))
    )
    response = await client.post(
        '/api/v1/coach/transcribe',
        headers=headers,
        files={'file': ('input.webm', b'x', 'audio/webm')},
        data={'language': 'ru', 'duration_seconds': '5'},
    )
    assert response.status_code == 503
    capability = (await client.get('/api/v1/capabilities')).json()
    assert (
        capability['openai']['last_check'] is None and not capability['openai']['configured']
    )


async def test_workout_multi_set_manual_nullable_and_owner_metrics(
    client, guest, database, session_payload, set_payload, completion_payload
):
    headers, _ = guest
    start = await post(
        client,
        '/workout-sessions',
        {**session_payload, 'client_engine_version': 'workout-session-v1'},
        headers,
    )
    path = '/workout-sessions/' + start['id']
    camera = {
        **set_payload,
        'target_snapshot': {
            'target_reps': 5,
            'duration_seconds': None,
            'rest_seconds': 30,
            'plan_sets': 2,
        },
    }
    first = await post(client, path + '/sets', camera, headers)
    manual = {
        **camera,
        'client_set_id': str(uuid.uuid4()),
        'set_index': 2,
        'total_reps': 4,
        'accepted_reps': 0,
        'assessment_mode': 'manual',
        'completion_status': 'completed',
        'metrics': {'mean_rep_duration_ms': None, 'mean_min_knee_angle': None},
        'error_counts': {'depth_insufficient': 0, 'too_fast': 0, 'incomplete_extension': 0},
        'engine_version': 'manual-v1',
    }
    second = await post(client, path + '/sets', manual, headers)
    assert second['metrics']['mean_min_knee_angle'] is None
    retry = await post(client, path + '/sets', manual, headers)
    assert retry['id'] == second['id']
    await post(client, path + '/sets', {**manual, 'accepted_reps': 1}, headers, 422)
    await post(
        client,
        path + '/sets',
        {**manual, 'metrics': {'mean_rep_duration_ms': 0, 'mean_min_knee_angle': 0}},
        headers,
        422,
    )
    summary = {
        **completion_payload['summary'],
        'total_reps': 9,
        'accepted_reps': 3,
        'rejected_reps': 2,
        'duration_ms': 54000,
        'total_sets': 2,
        'manual_completed_sets': 1,
        'camera_total_reps': 5,
    }
    done = await post(
        client, path + '/complete', {**completion_payload, 'summary': summary}, headers
    )
    assert done['summary']['total_sets'] == 2
    progress = (await client.get('/api/v1/progress/summary', headers=headers)).json()
    assert (
        progress['total_reps'] == 9
        and progress['acceptance_rate'] == 0.6
        and progress['rejected_reps'] == 2
    )
    assert progress['manual_completed_sets'] == 1
    await post(client, path + '/complete', {**completion_payload, 'summary': summary}, headers)
    await post(
        client,
        path + '/sets',
        {**manual, 'client_set_id': str(uuid.uuid4()), 'set_index': 3},
        headers,
        409,
    )
    assert first['target_snapshot'] == camera['target_snapshot']


async def test_generation_jobs_idempotency_claim_race_restart_cancel_fixture_and_fallback(
    client, guest, database, profile_payload, monkeypatch
):
    headers, user_id = guest
    await client.put('/api/v1/profile', json=profile_payload, headers=headers)
    payload = {'operation_id': str(uuid.uuid4()), 'execution_mode': 'live'}
    job = await post(client, '/generation-jobs', payload, headers, 202)
    retry = await post(client, '/generation-jobs', payload, headers, 202)
    assert retry['id'] == job['id']
    other = (await client.post('/api/v1/auth/guest')).json()
    foreign = {'Authorization': 'Bearer ' + other['access_token']}
    assert (
        await client.get('/api/v1/generation-jobs/' + job['id'], headers=foreign)
    ).status_code == 404
    claims = await asyncio.gather(*(models.generation_jobs.claim(200) for _ in range(2)))
    assert sum(bool(row) for row in claims) == 1
    row = next(row for row in claims if row)
    await models.generation_jobs.cancel(uuid.UUID(user_id), row['id'])
    with pytest.raises(models.JobCancelled):
        await models.generation_jobs.update(
            row['id'], row['lease_id'], {'stage': 'generating_plan'}
        )
    cancelled = await post(
        client,
        '/generation-jobs/' + job['id'] + '/cancel',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    assert cancelled['status'] == 'cancelled'
    new = await post(
        client,
        '/generation-jobs',
        {**payload, 'operation_id': str(uuid.uuid4())},
        headers,
        202,
    )
    assert await generation_jobs.run_once()
    completed = (
        await client.get('/api/v1/generation-jobs/' + new['id'], headers=headers)
    ).json()
    assert completed['status'] == 'fallback' and completed['result_plan_id']
    restart = await post(
        client,
        '/generation-jobs',
        {**payload, 'operation_id': str(uuid.uuid4())},
        headers,
        202,
    )
    claim = await models.generation_jobs.claim(1)
    async with database.begin() as conn:
        await conn.execute(
            models.generation_jobs.GenerationJobs.update()
            .where(models.generation_jobs.GenerationJobs.c.id == claim['id'])
            .values(
                lease_until=datetime.datetime.now(datetime.UTC) - datetime.timedelta(seconds=1)
            )
        )
    assert await models.generation_jobs.claim(200) == {}
    assert (await models.generation_jobs.get(uuid.UUID(user_id), uuid.UUID(restart['id'])))[
        'status'
    ] == 'interrupted'
    fixture = {**payload, 'operation_id': str(uuid.uuid4()), 'execution_mode': 'fixture'}
    await post(client, '/generation-jobs', fixture, headers, 403)
    monkeypatch.setenv('ENABLE_FIXTURE_MODE', 'true')
    config.clear_settings_cache()
    await post(client, '/demo-personas/maya/load', {}, headers)
    fixturejob = await post(client, '/generation-jobs', fixture, headers, 202)
    assert await generation_jobs.run_once()
    generated = (
        await client.get('/api/v1/generation-jobs/' + fixturejob['id'], headers=headers)
    ).json()
    assert (
        generated['status'] == 'completed'
        and generated['completed_specs'] == generated['total_specs'] > 0
    )
    missing = await client.get('/api/v1/generation-jobs/' + str(uuid.uuid4()), headers=headers)
    assert missing.status_code == 404
    await post(
        client,
        '/generation-jobs/' + str(uuid.uuid4()) + '/cancel',
        {'operation_id': str(uuid.uuid4())},
        headers,
        404,
    )
    # A context edit after submission produces a real stale-context failure.
    stale = await post(
        client,
        '/generation-jobs',
        {**payload, 'operation_id': str(uuid.uuid4())},
        headers,
        202,
    )
    await post(client, '/demo-personas/dana/load', {}, headers)
    assert await generation_jobs.run_once()
    assert (
        await client.get('/api/v1/generation-jobs/' + stale['id'], headers=headers)
    ).json()['error_category'] == 'stale_context'


async def test_live_persona_input_calls_provider_confirmed_rag_profile_cache_and_revision_audio(
    client, guest, database, monkeypatch, set_payload, session_payload
):
    headers, user_id = guest
    monkeypatch.setenv('AI_FEATURE_ENABLED', 'true')
    monkeypatch.setenv('OPENAI_API_KEY', 'mocked-key')
    config.clear_settings_cache()
    loaded = await post(client, '/demo-personas/maya/load', {}, headers)
    document = loaded['documents'][0]
    for fact in document['facts']:
        await client.put(
            '/api/v1/documents/' + document['id'] + '/facts/' + fact['id'],
            json={'status': 'confirmed'},
            headers=headers,
        )
    context = await models.ai_coach.context_get(uuid.UUID(user_id))
    profile = await models.profiles.profile_get(uuid.UUID(user_id))
    snapshot = await models.ai_coach.source_snapshot(uuid.UUID(user_id))
    canonical = controllers.demo_personas.deterministic_profile(
        context, profile, snapshot['facts']
    )
    plan_data = controllers.demo_personas.synthetic_plan(canonical)

    def spec_for(exercise, profile):
        return controllers.demo_personas.synthetic_spec(exercise, profile)

    generated_profile = AsyncMock(return_value=canonical)
    generated_plan = AsyncMock(return_value=copy.deepcopy(plan_data))
    generated_spec = AsyncMock(side_effect=spec_for)
    monkeypatch.setattr(openai, 'synthesize_user_profile', generated_profile)
    monkeypatch.setattr(openai, 'generate_personalized_plan', generated_plan)
    monkeypatch.setattr(openai, 'generate_movement_spec', generated_spec)
    monkeypatch.setattr(
        openai,
        'create_embeddings',
        AsyncMock(side_effect=openai.AIProviderUnavailable('config')),
    )
    result = await post(client, '/ai-profile/generate', {}, headers)
    assert result['provenance']['execution_mode'] == 'live' and result['model'] == 'gpt-5.4'
    model_input = generated_profile.call_args.args[0]
    assert model_input['retrieved_chunks'] and all(
        row['content'] for row in model_input['retrieved_chunks']
    )
    assert all(
        str(row['document_id']) == document['id'] for row in model_input['retrieved_chunks']
    )
    cached = await post(client, '/ai-profile/generate', {}, headers)
    assert (
        cached['id'] == result['id']
        and cached['provenance']['cached']
        and generated_profile.await_count == 1
    )
    plan = await post(client, '/training-plans/generate', {'mode': 'ai_assisted'}, headers)
    assert plan['ai_metadata']['provenance']['execution_mode'] == 'live'
    assert (
        generated_plan.await_count == 1
        and generated_spec.await_count > 0
        and generated_profile.await_count == 1
    )
    assert generated_plan.call_args.args[0]['retrieved_chunks'][0]['content']
    key = plan['ai_metadata']['days'][0]['items'][0]['exercise_key']
    spec = (await client.get('/api/v1/exercise-specs/' + key, headers=headers)).json()
    old_revision = spec['spec_revision']
    regenerated = await post(client, '/exercise-specs/' + key + '/regenerate', {}, headers)
    assert regenerated['spec_revision'] != old_revision
    assert (
        await models.ai_coach.spec_revision_get(
            uuid.UUID(user_id), key, uuid.UUID(old_revision)
        )
    )['movement_spec']
    await models.coach.preferences_replace(
        uuid.UUID(user_id),
        {
            'voice_id': 'account',
            'language': 'ru',
            'style': 'supportive',
            'audio_enabled': True,
        },
    )
    monkeypatch.setattr(elevenlabs, 'synthesize', AsyncMock(return_value=MP3))
    await post(
        client,
        '/speech/prewarm',
        {
            'cue_ids': [
                'calibration',
                'error:range_too_small',
                'phase:standing',
                'not_defined',
            ],
            'exercise_key': key,
            'spec_revision': old_revision,
        },
        headers,
    )
    assert elevenlabs.synthesize.await_count == 3
    start = await post(
        client,
        '/workout-sessions',
        {**session_payload, 'client_engine_version': 'generic-v1'},
        headers,
    )
    body = {
        **set_payload,
        'exercise_key': key,
        'spec_revision': old_revision,
        'engine_version': 'generic-v1',
        'metrics': {'mean_rep_duration_ms': 1000, 'mean_min_knee_angle': None},
    }
    assert (await post(client, '/workout-sessions/' + start['id'] + '/sets', body, headers))[
        'spec_revision'
    ] == old_revision
    await post(
        client,
        '/workout-sessions/' + start['id'] + '/sets',
        {
            **body,
            'client_set_id': str(uuid.uuid4()),
            'set_index': 2,
            'spec_revision': str(uuid.uuid4()),
        },
        headers,
        404,
    )
    await client.delete('/api/v1/documents/' + document['id'], headers=headers)
    assert (await client.get('/api/v1/ai-profile/current', headers=headers)).status_code == 404


async def test_live_coach_bounded_read_tools_prepared_schedule_and_confirmed_changes(
    client, guest, database, profile_payload, monkeypatch
):
    headers, user_id = guest
    await client.put('/api/v1/profile', json=profile_payload, headers=headers)
    plan = await post(client, '/training-plans/generate', {}, headers)
    await preferences_all_week(client, headers)
    data = (await client.get('/api/v1/schedule', headers=headers)).json()
    command = {
        'action': 'create',
        'appointment_id': None,
        'starts_at': data['slots'][0]['starts_at'],
        'duration_minutes': 20,
        'title': 'Practice',
        'plan_id': plan['id'],
    }
    answer = {
        'display_text': 'Saved (untruthful provider wording)',
        'speech_text': 'Saved',
        'source_references': [],
        'ui_actions': ['open_schedule'],
    }
    provider = AsyncMock(
        side_effect=[
            {
                'calls': [
                    {'name': 'get_progress_summary', 'arguments': '{}', 'call_id': 'read'}
                ],
                'output': [],
                'answer': None,
            },
            {
                'calls': [
                    {
                        'name': 'prepare_schedule_change',
                        'arguments': __import__('json').dumps(command),
                        'call_id': 'prepare',
                    }
                ],
                'output': [],
                'answer': None,
            },
            {'calls': [], 'output': [], 'answer': answer},
        ]
    )
    monkeypatch.setattr(openai, 'coach_response', provider)
    request = {
        'operation_id': str(uuid.uuid4()),
        'conversation_id': None,
        'text': 'Schedule practice',
        'screen': 'schedule',
        'exercise_key': None,
    }
    reply = await post(client, '/coach/turns', request, headers)
    assert reply['provenance']['execution_mode'] == 'live' and len(reply['proposals']) == 1
    assert 'Saved' not in reply['display_text'] and 'подтверди' in reply['display_text']
    assert (await client.get('/api/v1/schedule', headers=headers)).json()['appointments'] == []
    confirmed = await post(
        client,
        '/coach/proposals/' + reply['proposal_ids'][0] + '/confirm',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    assert confirmed['result']['saved']
    actor = schemas.UserCurrent(id=uuid.UUID(user_id), email=None)
    for name, args in [
        ('get_profile_context', {}),
        ('get_active_plan', {}),
        ('get_exercise_details', {'exercise_key': 'bodyweight_squat'}),
        ('get_schedule', {}),
        ('get_available_slots', {}),
    ]:
        result, is_proposal = await coach.tool(actor, name, args, uuid.uuid4())
        assert isinstance(result, dict) and not is_proposal
    with pytest.raises(exceptions.HTTPBadRequestException):
        await coach.tool(actor, 'shell', {}, uuid.uuid4())
    proposal, is_proposal = await coach.tool(
        actor,
        'prepare_plan_change',
        {'plan_id': plan['id'], 'target_reps': 3, 'sets': 1},
        uuid.uuid4(),
    )
    assert is_proposal
    changed = await post(
        client,
        '/coach/proposals/' + str(proposal['id']) + '/confirm',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    assert changed['result']['applied']
    current = (await client.get('/api/v1/training-plans/current', headers=headers)).json()
    assert current['items'][0]['target_reps'] == 3
    swapped = await coach.prepare_plan(
        actor,
        'exercise_swap',
        {
            'plan_id': plan['id'],
            'item_id': current['items'][0]['id'],
            'exercise_key': 'bodyweight_squat',
        },
        uuid.uuid4(),
    )
    await post(
        client,
        '/coach/proposals/' + str(swapped['id']) + '/confirm',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    with pytest.raises(exceptions.HTTPNotFoundException):
        await coach.prepare_plan(
            actor,
            'exercise_swap',
            {
                'plan_id': plan['id'],
                'item_id': str(uuid.uuid4()),
                'exercise_key': 'bodyweight_squat',
            },
            uuid.uuid4(),
        )
    with pytest.raises(exceptions.HTTPBadRequestException):
        await coach.prepare_plan(
            actor,
            'exercise_swap',
            {
                'plan_id': plan['id'],
                'item_id': current['items'][0]['id'],
                'exercise_key': 'not_allowed',
            },
            uuid.uuid4(),
        )
    with pytest.raises(exceptions.HTTPConflictException):
        await coach.prepare_plan(
            actor,
            'plan_change',
            {'plan_id': str(uuid.uuid4()), 'target_reps': 3, 'sets': 1},
            uuid.uuid4(),
        )
    provider.side_effect = None
    provider.return_value = {
        'calls': [{'name': 'not_allowed', 'arguments': '{}', 'call_id': 'bad'}],
        'output': [],
        'answer': None,
    }
    bounded = await post(
        client, '/coach/turns', {**request, 'operation_id': str(uuid.uuid4())}, headers
    )
    assert (
        bounded['provenance']['execution_mode'] == 'fallback'
        and bounded['error_category'] == 'tool_limit'
    )
    provider.return_value = {
        'calls': [],
        'output': [],
        'answer': {
            **answer,
            'source_references': [
                {'type': 'document', 'label': 'Foreign', 'source_id': str(uuid.uuid4())}
            ],
        },
    }
    invalid = await post(
        client, '/coach/turns', {**request, 'operation_id': str(uuid.uuid4())}, headers
    )
    assert (
        invalid['provenance']['execution_mode'] == 'fallback'
        and invalid['error_category'] == 'schema'
    )
    assert all(
        'user_id' not in tool['parameters']['properties'] for tool in coach.tool_definitions()
    )


async def test_job_runner_lifecycle_and_sanitized_failure_loop(monkeypatch):
    count = 0

    async def fake_sleep(seconds):
        nonlocal count
        count += 1
        if count > 1:
            raise asyncio.CancelledError

    monkeypatch.setattr(job_service.asyncio, 'sleep', fake_sleep)
    monkeypatch.setattr(
        job_service.controllers.generation_jobs,
        'run_once',
        AsyncMock(side_effect=RuntimeError('private')),
    )
    with pytest.raises(asyncio.CancelledError):
        await job_service.loop()
    await job_service.on_startup()
    await job_service.on_shutdown()


async def test_confirmed_ai_plan_edits_keep_visible_metadata_in_sync(
    client, guest, monkeypatch
):
    headers, user_id = guest
    monkeypatch.setenv('ENABLE_FIXTURE_MODE', 'true')
    monkeypatch.setenv('ENABLE_DEMO_PERSONAS', 'true')
    monkeypatch.setenv('COACH_EXECUTION_MODE', 'fixture')
    config.clear_settings_cache()
    await post(client, '/demo-personas/maya/load', None, headers)
    plan = await post(client, '/training-plans/generate', {'mode': 'ai_assisted'}, headers)
    actor = schemas.UserCurrent(id=uuid.UUID(user_id), email=None)
    changed = await coach.prepare_plan(
        actor,
        'plan_change',
        {'plan_id': plan['id'], 'target_reps': 3, 'sets': 1},
        uuid.uuid4(),
    )
    await post(
        client,
        '/coach/proposals/' + str(changed['id']) + '/confirm',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    current = (await client.get('/api/v1/training-plans/current', headers=headers)).json()
    assert all(
        item['target_reps'] == 3 and item['sets'] == 1
        for day in current['ai_metadata']['days']
        for item in day['items']
    )
    item = current['items'][0]
    swapped = await coach.prepare_plan(
        actor,
        'exercise_swap',
        {'plan_id': plan['id'], 'item_id': item['id'], 'exercise_key': 'bodyweight_squat'},
        uuid.uuid4(),
    )
    await post(
        client,
        '/coach/proposals/' + str(swapped['id']) + '/confirm',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    current = (await client.get('/api/v1/training-plans/current', headers=headers)).json()
    day = next(
        day for day in current['ai_metadata']['days'] if day['day_index'] == item['day_index']
    )
    assert day['items'][item['position']]['exercise_key'] == 'bodyweight_squat'
    assert day['items'][item['position']]['camera_coaching_mode'] == 'predefined'
    assert current['items'][0]['exercise']['key'] == 'bodyweight_squat'
