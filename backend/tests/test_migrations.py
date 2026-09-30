"""Verify a forward schema change preserves existing guest workout data."""

import os
import subprocess
import sys
import uuid

import pytest
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from src.core import postgres


@pytest.mark.xdist_group('domains')
async def test_upgrade_preserves_populated_previous_revision(
    disposable_database_url,
    monkeypatch,
    client,
    profile_payload,
    session_payload,
    set_payload,
    completion_payload,
):
    # The existing fixture validates the local test host and disposable ownership.
    original_url = make_url(disposable_database_url)
    name = 'dungeon_refactor_upgrade_' + uuid.uuid4().hex + '_test'
    url = original_url.set(database=name)
    env = dict(os.environ, PGPASSWORD=url.password or '', DEBUG='false')
    env['DATABASE_URL'] = url.render_as_string(hide_password=False)
    args = ['-h', url.host, '-p', str(url.port or 5432), '-U', url.username]
    subprocess.run(
        ['createdb', *args, '--template=template0', '--encoding=UTF8', name],
        env=env,
        check=True,
        capture_output=True,
    )
    engine = create_async_engine(url, poolclass=NullPool, hide_parameters=True)
    try:
        subprocess.run(
            [sys.executable, '-m', 'alembic', 'upgrade', 'e2dc2dbe10a5'],
            env=env,
            check=True,
            capture_output=True,
        )
        monkeypatch.setattr(postgres, '_engine', engine)
        guest = await client.post('/api/v1/auth/guest')
        assert guest.status_code == 200
        user_id = uuid.UUID(guest.json()['user']['id'])
        headers = {'Authorization': 'Bearer ' + guest.json()['access_token']}
        profile = {**profile_payload, 'confirmed_constraints': ['avoid_overhead']}
        assert (
            await client.put('/api/v1/profile', json=profile, headers=headers)
        ).status_code == 200
        generated = await client.post('/api/v1/training-plans/generate', headers=headers)
        assert generated.status_code == 200
        plan = generated.json()
        session_body = {**session_payload, 'plan_id': plan['id']}
        started = await client.post(
            '/api/v1/workout-sessions', json=session_body, headers=headers
        )
        assert started.status_code == 200
        session_id = started.json()['id']
        path = '/api/v1/workout-sessions/' + session_id
        saved_set = await client.post(path + '/sets', json=set_payload, headers=headers)
        assert saved_set.status_code == 200
        completed = await client.post(
            path + '/complete', json=completion_payload, headers=headers
        )
        assert completed.status_code == 200
        async with engine.begin() as connection:
            users = postgres.metadata.tables['users']
            constraints = postgres.metadata.tables['health_constraints']
            await connection.execute(
                users.update()
                .where(users.c.id == user_id)
                .values(email='migration@example.com', display_name='Проверка')
            )
            await connection.execute(
                constraints.update()
                .where(constraints.c.user_id == user_id)
                .values(note='Тест миграции')
            )

        async def snapshot():
            async with engine.connect() as connection:
                return {
                    table.name: [
                        dict(row)
                        for row in (
                            await connection.execute(
                                table.select().order_by(*table.primary_key.columns)
                            )
                        ).mappings()
                    ]
                    for table in postgres.metadata.sorted_tables
                }

        before = await snapshot()
        endpoints = [
            '/api/v1/auth/me',
            '/api/v1/profile',
            '/api/v1/training-plans/current',
            '/api/v1/progress/summary',
        ]
        before_responses = [
            (await client.get(endpoint, headers=headers)).json() for endpoint in endpoints
        ]
        await engine.dispose()
        subprocess.run(
            [sys.executable, '-m', 'alembic', 'upgrade', 'head'],
            env=env,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            [sys.executable, '-m', 'alembic', 'check'],
            env=env,
            check=True,
            capture_output=True,
        )
        assert await snapshot() == before
        after_responses = [
            (await client.get(endpoint, headers=headers)).json() for endpoint in endpoints
        ]
        assert after_responses == before_responses
        for endpoint, payload, expected in [
            ('/api/v1/workout-sessions', session_body, completed.json()),
            (path + '/sets', set_payload, saved_set.json()),
            (path + '/complete', completion_payload, completed.json()),
        ]:
            response = await client.post(endpoint, json=payload, headers=headers)
            assert response.status_code == 200
            assert response.json() == expected
    finally:
        await engine.dispose()
        subprocess.run(['dropdb', *args, name], env=env, check=True, capture_output=True)
