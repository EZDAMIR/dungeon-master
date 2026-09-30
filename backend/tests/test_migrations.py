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
            [sys.executable, '-m', 'alembic', 'upgrade', 'd14a8a94311f'],
            env=env,
            check=True,
            capture_output=True,
        )
        monkeypatch.setattr(postgres, '_engine', engine)
        guest = await client.post('/api/v1/auth/guest')
        assert guest.status_code == 200
        user_id = uuid.UUID(guest.json()['user']['id'])
        headers = {'Authorization': 'Bearer ' + guest.json()['access_token']}
        # Sprint 4A tests the deployed Sprint 3 schema using reflection, not current models.
        import datetime

        import sqlalchemy as sa

        from src.api import models

        timestamp = datetime.datetime(2026, 9, 30, tzinfo=datetime.UTC)
        physical = sa.MetaData()
        async with engine.begin() as connection:
            await connection.run_sync(physical.reflect)
            await connection.execute(
                physical.tables['profiles']
                .insert()
                .values(
                    user_id=user_id,
                    **{
                        k: v
                        for k, v in profile_payload.items()
                        if k != 'confirmed_constraints'
                    },
                )
            )
            exercise = (
                (
                    await connection.execute(
                        physical.tables['exercises']
                        .select()
                        .where(physical.tables['exercises'].c.key == 'bodyweight_squat')
                    )
                )
                .mappings()
                .one()
            )
            session_id = uuid.uuid4()
            await connection.execute(
                physical.tables['workout_sessions']
                .insert()
                .values(
                    id=session_id,
                    user_id=user_id,
                    client_session_id=uuid.UUID(session_payload['client_session_id']),
                    status='completed',
                    started_at=timestamp,
                    completed_at=timestamp + datetime.timedelta(seconds=27),
                    client_engine_version='squat-v1',
                    summary=completion_payload['summary'],
                )
            )
            await connection.execute(
                physical.tables['workout_set_results']
                .insert()
                .values(
                    id=uuid.uuid4(),
                    session_id=session_id,
                    exercise_id=exercise['id'],
                    **{
                        k: v
                        for k, v in set_payload.items()
                        if k not in {'exercise_key', 'engine_version', 'client_set_id'}
                    },
                    client_set_id=uuid.UUID(set_payload['client_set_id']),
                )
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
                    for table in physical.sorted_tables
                    if table.name != 'alembic_version'
                }

        before = await snapshot()
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
        profile = await client.get('/api/v1/profile', headers=headers)
        assert profile.status_code == 200
        progress = await client.get('/api/v1/progress/summary', headers=headers)
        assert progress.status_code == 200
        assert progress.json()['total_reps'] == 5
        assert progress.json()['recent_sessions'][0]['exercise_key'] == 'bodyweight_squat'
        row = await models.workout_sessions.session_get(user_id, session_id)
        assert row['summary'] == completion_payload['summary']
    finally:
        await engine.dispose()
        subprocess.run(['dropdb', *args, name], env=env, check=True, capture_output=True)
