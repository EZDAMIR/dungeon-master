import datetime
import uuid

import pytest

from src.api import auth, models, permission, schemas
from src.core import security

pytestmark = [pytest.mark.usefixtures('database'), pytest.mark.xdist_group('domains')]


async def test_guest_create_and_me(client, caplog):
    a = (await client.post('/api/v1/auth/guest')).json()
    b = (await client.post('/api/v1/auth/guest')).json()
    assert a['user']['id'] != b['user']['id']
    assert a['user']['email'] is None
    assert a['user']['is_guest'] is True
    claims = security.decode_access_token(a['access_token'])
    assert claims['permissions'] == [p.value for p in permission.Perm]
    current = await auth.get_current_user(token=a['access_token'])
    assert current.email is None
    assert type(await models.users.user_get(current.id)) is dict
    response = await client.get(
        '/api/v1/auth/me', headers={'Authorization': 'Bearer ' + a['access_token']}
    )
    assert response.status_code == 200
    assert response.json() == a['user']
    assert 'updated_at' not in response.json()
    assert a['access_token'] not in caplog.text
    assert a['expires_in'] == 3600


async def test_auth_invalid_expired_missing_unknown_and_input(client):
    for token in [
        None,
        'bad',
        security.create_access_token(
            {'id': str(uuid.uuid4()), 'email': None}, datetime.timedelta(seconds=-1)
        ),
        security.create_access_token({'id': 'bad', 'email': None}),
    ]:
        response = await client.get(
            '/api/v1/auth/me', headers={'Authorization': 'Bearer ' + token} if token else {}
        )
        assert response.status_code == 401
    token = security.create_access_token({'id': str(uuid.uuid4()), 'email': None})
    assert (
        await client.get('/api/v1/auth/me', headers={'Authorization': 'Bearer ' + token})
    ).status_code == 401
    assert (
        await client.post('/api/v1/auth/guest', json={'id': str(uuid.uuid4())})
    ).status_code == 422
    assert schemas.UserCurrent(id=uuid.uuid4(), email=None).email is None
