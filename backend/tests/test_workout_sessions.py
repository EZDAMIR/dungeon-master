import asyncio
import uuid

import pydantic
import pytest
import sqlalchemy as sa

from src.api import models
from src.api import schemas

pytestmark = [pytest.mark.xdist_group('domains')]


@pytest.mark.parametrize(
    'field,value',
    [
        ('accepted_reps', 6),
        ('duration_ms', -1),
        ('duration_ms', 3_600_001),
        ('total_reps', 501),
        ('set_index', 0),
        ('engine_version', 'x' * 51),
        ('error_counts', {'unknown': 1}),
        ('metrics', {'mean_rep_duration_ms': float('nan'), 'mean_min_knee_angle': 100}),
        ('metrics', {'mean_rep_duration_ms': 10, 'mean_min_knee_angle': float('inf')}),
        ('metrics', {'mean_rep_duration_ms': 10, 'mean_min_knee_angle': 181}),
        *[(field, []) for field in ['landmarks', 'frames', 'video', 'image', 'screenshot']],
    ],
)
def test_invalid_set_payload(set_payload, field, value):
    with pytest.raises(pydantic.ValidationError):
        schemas.workout_sessions.WorkoutSetCreate(**{**set_payload, field: value})


def test_complete_schema(completion_payload):
    for data in [
        {**completion_payload, 'completed_at': None},
        {
            **completion_payload,
            'summary': {**completion_payload['summary'], 'rejected_reps': 0},
        },
        {
            **completion_payload,
            'summary': {**completion_payload['summary'], 'accepted_reps': 6},
        },
    ]:
        with pytest.raises(pydantic.ValidationError):
            schemas.workout_sessions.WorkoutComplete(**data)


async def test_three_step_idempotency_immutability(
    database, client, guest, session_payload, set_payload, completion_payload
):
    headers, _ = guest
    a = await client.post('/api/v1/workout-sessions', json=session_payload, headers=headers)
    assert a.status_code == 200
    session = a.json()
    path = '/api/v1/workout-sessions/' + session['id']
    assert session['status'] == 'started' and session['completed_at'] is None
    assert (
        await client.post('/api/v1/workout-sessions', json=session_payload, headers=headers)
    ).json() == session
    assert (
        await client.post(
            '/api/v1/workout-sessions',
            json={**session_payload, 'client_engine_version': 'different'},
            headers=headers,
        )
    ).status_code == 409
    saved = await client.post(path + '/sets', json=set_payload, headers=headers)
    assert saved.status_code == 200
    assert saved.json()['metrics'] == set_payload['metrics']
    duplicate = await client.post(path + '/sets', json=set_payload, headers=headers)
    assert duplicate.json() == saved.json()
    assert (
        await client.post(
            path + '/sets', json={**set_payload, 'total_reps': 6}, headers=headers
        )
    ).status_code == 409
    assert (
        await client.post(
            path + '/sets',
            json={**set_payload, 'client_set_id': str(uuid.uuid4())},
            headers=headers,
        )
    ).status_code == 409
    assert (
        await client.post(
            path + '/sets', json={**set_payload, 'engine_version': 'other'}, headers=headers
        )
    ).status_code == 409
    bad = {
        **completion_payload,
        'summary': {**completion_payload['summary'], 'duration_ms': 1},
    }
    assert (
        await client.post(path + '/complete', json=bad, headers=headers)
    ).status_code == 409
    done = await client.post(path + '/complete', json=completion_payload, headers=headers)
    assert done.status_code == 200
    assert done.json()['status'] == 'completed' and done.json()['completed_at'] is not None
    assert (
        await client.post(path + '/complete', json=completion_payload, headers=headers)
    ).json() == done.json()
    assert (
        await client.post(
            path + '/complete',
            json={**completion_payload, 'completed_at': '2026-09-30T00:01:00Z'},
            headers=headers,
        )
    ).status_code == 409
    assert (
        await client.post(
            path + '/sets',
            json={**set_payload, 'set_index': 2, 'client_set_id': str(uuid.uuid4())},
            headers=headers,
        )
    ).status_code == 409
    assert (
        await client.post(path + '/sets', json=set_payload, headers=headers)
    ).json() == saved.json()
    assert (
        await client.post('/api/v1/workout-sessions', json=session_payload, headers=headers)
    ).json() == done.json()


async def test_ownership_plan_cascade_and_missing(
    database, client, guest, profile_payload, session_payload, set_payload, completion_payload
):
    headers, user_id = guest
    await client.put('/api/v1/profile', json=profile_payload, headers=headers)
    plan = (await client.post('/api/v1/training-plans/generate', headers=headers)).json()
    session_payload['plan_id'] = plan['id']
    created = (
        await client.post('/api/v1/workout-sessions', json=session_payload, headers=headers)
    ).json()
    path = '/api/v1/workout-sessions/' + created['id']
    other = (await client.post('/api/v1/auth/guest')).json()
    other_headers = {'Authorization': 'Bearer ' + other['access_token']}
    assert (
        await client.post(
            '/api/v1/workout-sessions', json=session_payload, headers=other_headers
        )
    ).status_code == 404
    for suffix, body in [('/sets', set_payload), ('/complete', completion_payload)]:
        assert (
            await client.post(path + suffix, json=body, headers=other_headers)
        ).status_code == 404
        assert (
            await client.post(
                '/api/v1/workout-sessions/' + str(uuid.uuid4()) + suffix,
                json=body,
                headers=headers,
            )
        ).status_code == 404
    second = await client.post(
        '/api/v1/workout-sessions',
        json={**session_payload, 'plan_id': None},
        headers=other_headers,
    )
    assert second.status_code == 200 and second.json()['id'] != created['id']
    assert (
        await client.post(
            path + '/complete',
            json={**completion_payload, 'completed_at': '2026-09-29T00:00:00Z'},
            headers=headers,
        )
    ).status_code == 409
    assert (
        await client.post(path + '/complete', json=completion_payload, headers=headers)
    ).status_code == 409
    assert (
        await client.post(path + '/sets', json=set_payload, headers=headers)
    ).status_code == 200
    async with database.begin() as conn:
        await conn.execute(
            models.users.Users.delete().where(models.users.Users.c.id == uuid.UUID(user_id))
        )
        assert not (
            await conn.execute(
                models.workout_sessions.WorkoutSetResults.select().where(
                    models.workout_sessions.WorkoutSetResults.c.session_id
                    == uuid.UUID(created['id'])
                )
            )
        ).all()
    assert (
        await client.post('/api/v1/workout-sessions', json=session_payload, headers=headers)
    ).status_code == 401


async def test_concurrent_duplicate_and_inactive_exercise(
    database, client, guest, session_payload, set_payload, completion_payload
):
    headers, user_id = guest
    schema = schemas.workout_sessions.WorkoutSessionCreate(**session_payload)
    data = schema.model_dump(mode='json', by_alias=True)
    sessions = await asyncio.gather(
        *[models.workout_sessions.session_create(uuid.UUID(user_id), data) for _ in range(3)]
    )
    assert len({row['id'] for row in sessions}) == 1
    sid = sessions[0]['id']
    path = '/api/v1/workout-sessions/' + str(sid)
    async with database.begin() as conn:
        await conn.execute(models.exercises.Exercises.update().values(is_active=False))
    try:
        assert (
            await client.post(path + '/sets', json=set_payload, headers=headers)
        ).status_code == 404
    finally:
        async with database.begin() as conn:
            await conn.execute(models.exercises.Exercises.update().values(is_active=True))
    data = schemas.workout_sessions.WorkoutSetCreate(**set_payload).model_dump(
        mode='json', by_alias=True, exclude={'exercise_key', 'engine_version'}
    )
    results = await asyncio.gather(
        *[
            models.workout_sessions.set_create(
                uuid.UUID(user_id),
                sid,
                data,
                exercise_key=set_payload['exercise_key'],
                engine_version=set_payload['engine_version'],
            )
            for _ in range(3)
        ]
    )
    assert all(type(row) is dict for row in results)
    assert len({row['id'] for row in results}) == 1
    data = schemas.workout_sessions.WorkoutComplete(**completion_payload).model_dump(
        mode='json', by_alias=True
    )
    done = await asyncio.gather(
        *[
            models.workout_sessions.session_complete(uuid.UUID(user_id), sid, data)
            for _ in range(3)
        ]
    )
    assert len({row['id'] for row in done}) == 1


def test_session_enum_parity():
    assert set(models.workout_sessions.WorkoutSessions.c.status.type.enums) == {
        v.value for v in schemas.workout_sessions.SessionStatusEnum
    }


async def test_persisted_check_constraints_and_historical_duplicate(
    database, client, guest, session_payload, set_payload, completion_payload
):
    headers, user_id = guest
    created = (
        await client.post('/api/v1/workout-sessions', json=session_payload, headers=headers)
    ).json()
    sid = uuid.UUID(created['id'])
    path = '/api/v1/workout-sessions/' + str(sid)
    data = schemas.workout_sessions.WorkoutSetCreate(**set_payload).model_dump(
        mode='json', by_alias=True, exclude={'exercise_key', 'engine_version'}
    )
    for changes in [{'accepted_reps': 6}, {'duration_ms': -1}, {'set_index': 0}]:
        with pytest.raises(sa.exc.IntegrityError):
            await models.workout_sessions.set_create(
                uuid.UUID(user_id),
                sid,
                {**data, **changes},
                exercise_key=set_payload['exercise_key'],
                engine_version=set_payload['engine_version'],
            )
    saved = await client.post(path + '/sets', headers=headers, json=set_payload)
    await client.post(path + '/complete', headers=headers, json=completion_payload)
    async with database.begin() as conn:
        await conn.execute(models.exercises.Exercises.update().values(is_active=False))
    try:
        repeated = await client.post(path + '/sets', headers=headers, json=set_payload)
        assert repeated.status_code == 200 and repeated.json() == saved.json()
    finally:
        async with database.begin() as conn:
            await conn.execute(models.exercises.Exercises.update().values(is_active=True))
