"""OAuth/encryption/state replay and owner-scoped local/external reconciliation."""

import datetime
import uuid
from unittest.mock import AsyncMock
from urllib.parse import parse_qs
from urllib.parse import urlsplit

import pytest
from cryptography.fernet import Fernet

from src.api import models
from src.api import schemas
from src.api.controllers import calendar
from src.api.webhooks import google_calendar
from src.core import config
from tests.test_sprint4b import post
from tests.test_sprint4b import preferences_all_week
from tests.test_sprint4b import proposal_at_first_slot

pytestmark = pytest.mark.xdist_group('domains')


@pytest.fixture
def google_config(monkeypatch):
    for key, value in {
        'GOOGLE_CALENDAR_ENABLED': 'true',
        'GOOGLE_CLIENT_ID': 'mock-client',
        'GOOGLE_CLIENT_SECRET': 'mock-secret',
        'GOOGLE_REDIRECT_URI': 'http://localhost:8001/api/v1/integrations/google/callback',
        'OAUTH_TOKEN_ENCRYPTION_KEY': Fernet.generate_key().decode(),
    }.items():
        monkeypatch.setenv(key, value)
    config.clear_settings_cache()


async def connect(client, headers, monkeypatch, tokens=None):
    response = await post(
        client, '/integrations/google/authorize', {'operation_id': str(uuid.uuid4())}, headers
    )
    state = parse_qs(urlsplit(response['authorization_url']).query)['state'][0]
    monkeypatch.setattr(
        google_calendar,
        'token',
        AsyncMock(
            return_value=tokens
            or {
                'access_token': 'mock-access',
                'refresh_token': 'mock-refresh',
                'expires_in': 3600,
            }
        ),
    )
    callback = await client.get(
        '/api/v1/integrations/google/callback', params={'state': state, 'code': 'mock-code'}
    )
    assert callback.status_code == 200, callback.text
    return state


async def test_google_disabled_setup_does_not_block_local_schedule(client, guest, database):
    headers, _ = guest
    status = (await client.get('/api/v1/integrations/google/status', headers=headers)).json()
    assert not status['configured'] and not status['connected']
    await post(
        client,
        '/integrations/google/authorize',
        {'operation_id': str(uuid.uuid4())},
        headers,
        503,
    )
    await post(
        client, '/integrations/google/sync', {'operation_id': str(uuid.uuid4())}, headers, 503
    )
    assert (
        await client.get('/api/v1/schedule/export.ics', headers=headers)
    ).status_code == 200
    assert (
        await client.delete('/api/v1/integrations/google/connection', headers=headers)
    ).status_code == 200


async def test_google_owner_state_replay_encrypted_tokens_refresh_preserved_and_disconnect(
    client, guest, database, google_config, monkeypatch
):
    headers, user_id = guest
    state = await connect(client, headers, monkeypatch)
    row = await models.calendar.connection_get(uuid.UUID(user_id))
    assert (
        'mock-access' not in row['tokens_encrypted']
        and 'mock-refresh' not in row['tokens_encrypted']
    )
    assert calendar.decrypt(row['tokens_encrypted'])['refresh_token'] == 'mock-refresh'
    assert (await client.get('/api/v1/integrations/google/status', headers=headers)).json()[
        'connected'
    ]
    replay = await client.get(
        '/api/v1/integrations/google/callback', params={'state': state, 'code': 'mock-code'}
    )
    assert replay.status_code == 400
    await connect(
        client, headers, monkeypatch, {'access_token': 'new-access', 'expires_in': 3600}
    )
    row = await models.calendar.connection_get(uuid.UUID(user_id))
    assert calendar.decrypt(row['tokens_encrypted'])['refresh_token'] == 'mock-refresh'
    other = (await client.post('/api/v1/auth/guest')).json()
    foreign = {'Authorization': 'Bearer ' + other['access_token']}
    assert not (
        await client.get('/api/v1/integrations/google/status', headers=foreign)
    ).json()['connected']
    actor = schemas.UserCurrent(id=uuid.UUID(user_id), email=None)
    async with database.begin() as conn:
        await conn.execute(
            models.calendar.CalendarConnections.update()
            .where(models.calendar.CalendarConnections.c.user_id == actor.id)
            .values(
                expires_at=datetime.datetime.now(datetime.UTC) - datetime.timedelta(seconds=1)
            )
        )
    monkeypatch.setattr(
        google_calendar,
        'token',
        AsyncMock(return_value={'access_token': 'fresh-access', 'expires_in': 3600}),
    )
    assert await calendar.access(actor) == 'fresh-access'
    assert (
        calendar.decrypt((await models.calendar.connection_get(actor.id))['tokens_encrypted'])[
            'refresh_token'
        ]
        == 'mock-refresh'
    )
    revoke = AsyncMock()
    monkeypatch.setattr(google_calendar, 'revoke', revoke)
    disconnected = await client.delete(
        '/api/v1/integrations/google/connection', headers=headers
    )
    assert disconnected.status_code == 200 and not disconnected.json()['connected']
    revoke.assert_awaited_once_with('mock-refresh')
    assert await models.calendar.connection_get(actor.id) == {}


async def test_google_sync_mapping_idempotency_busy_stale_and_partial_failure(
    client, guest, database, google_config, monkeypatch
):
    headers, user_id = guest
    await connect(client, headers, monkeypatch)
    await preferences_all_week(client, headers)
    proposal, _ = await proposal_at_first_slot(client, headers)
    done = await post(
        client,
        '/coach/proposals/' + proposal['id'] + '/confirm',
        {'operation_id': str(uuid.uuid4())},
        headers,
    )
    appointment_id = uuid.UUID(done['result']['appointment_id'])
    monkeypatch.setattr(google_calendar, 'freebusy', AsyncMock(return_value=[]))
    event = AsyncMock(
        return_value={'event_id': appointment_id.hex, 'etag': 'etag', 'deleted': False}
    )
    monkeypatch.setattr(google_calendar, 'event_sync', event)
    command = {'operation_id': str(uuid.uuid4())}
    synced = await post(client, '/integrations/google/sync', command, headers)
    assert synced == {'synced': 1, 'failed': 0, 'status': 'synced'}
    assert await post(client, '/integrations/google/sync', command, headers) == synced
    assert event.await_count == 1
    mapping = await models.calendar.link_get(uuid.UUID(user_id), appointment_id)
    assert mapping['event_id'] == appointment_id.hex
    row = await models.schedule.appointment_get(uuid.UUID(user_id), appointment_id)
    assert row['sync_status'] == 'synced'
    async with database.begin() as conn:
        await conn.execute(
            models.schedule.ScheduleAppointments.update()
            .where(models.schedule.ScheduleAppointments.c.id == appointment_id)
            .values(sync_status='pending')
        )
    own = {
        'start': {'dateTime': row['starts_at'].isoformat()},
        'end': {'dateTime': row['ends_at'].isoformat()},
    }
    monkeypatch.setattr(google_calendar, 'event_get', AsyncMock(return_value=own))
    monkeypatch.setattr(
        google_calendar,
        'freebusy',
        AsyncMock(return_value=[{'starts_at': row['starts_at'], 'ends_at': row['ends_at']}]),
    )
    resynced = await post(
        client, '/integrations/google/sync', {'operation_id': str(uuid.uuid4())}, headers
    )
    assert resynced['synced'] == 1
    async with database.begin() as conn:
        await conn.execute(
            models.schedule.ScheduleAppointments.update()
            .where(models.schedule.ScheduleAppointments.c.id == appointment_id)
            .values(sync_status='pending')
        )
    monkeypatch.setattr(
        google_calendar,
        'freebusy',
        AsyncMock(
            return_value=[
                {
                    'starts_at': row['starts_at'] - datetime.timedelta(minutes=5),
                    'ends_at': row['ends_at'],
                }
            ]
        ),
    )
    blocked = await post(
        client, '/integrations/google/sync', {'operation_id': str(uuid.uuid4())}, headers
    )
    assert blocked['failed'] == 1
    assert (await models.schedule.appointment_get(uuid.UUID(user_id), appointment_id))[
        'sync_status'
    ] == 'error'
    # Stale persistence leaves a new appointment version pending for reconciliation.
    stale = await models.calendar.sync_save(
        uuid.UUID(user_id),
        {**row, 'starts_at': row['starts_at'] - datetime.timedelta(minutes=1)},
        None,
    )
    assert stale['stale']


async def test_revoked_refresh_persists_reconnect_state(
    client, guest, google_config, monkeypatch
):
    headers, user_id = guest
    await connect(client, headers, monkeypatch)
    actor = schemas.UserCurrent(id=uuid.UUID(user_id), email=None)
    row = await models.calendar.connection_get(actor.id)
    await models.calendar.connection_save(
        actor.id,
        {
            'tokens_encrypted': row['tokens_encrypted'],
            'expires_at': datetime.datetime.now(datetime.UTC) - datetime.timedelta(minutes=1),
            'status': 'connected',
        },
    )
    monkeypatch.setattr(
        google_calendar,
        'token',
        AsyncMock(side_effect=google_calendar.CalendarUnavailable('revoked')),
    )
    with pytest.raises(google_calendar.CalendarUnavailable):
        await calendar.access(actor)
    status = await calendar.status(actor)
    assert status['sync_status'] == 'revoked' and not status['connected']
