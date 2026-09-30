import asyncio
import datetime
import uuid
from unittest.mock import AsyncMock

import pytest
import sqlalchemy as sa

from src.api import controllers, exceptions, models, schemas

pytestmark = [pytest.mark.xdist_group('domains')]


@pytest.mark.parametrize(
    'days,expected',
    [
        (1, [0]),
        (2, [0, 3]),
        (3, [0, 2, 4]),
        (4, [0, 1, 3, 5]),
        (5, [0, 1, 2, 4, 5]),
        (6, [0, 1, 2, 3, 4, 5]),
        (7, [0, 1, 2, 3, 4, 5, 6]),
    ],
)
def test_deterministic_generator(profile_payload, days, expected):
    profile = {**profile_payload, 'days_per_week': days}
    eligible = [{'id': uuid.uuid4(), 'key': 'bodyweight_squat'}]
    start = datetime.date(2026, 9, 28)
    a = controllers.training_plans.build_weekly_plan(profile, eligible, start)
    assert a == controllers.training_plans.build_weekly_plan(profile, eligible, start)
    assert [item['day_index'] for item in a['items']] == expected
    assert {item['exercise_id'] for item in a['items']} == {str(eligible[0]['id'])}
    assert all(item['sets'] == 1 and item['target_reps'] == 5 for item in a['items'])


async def test_plans_api_archive_isolation_empty(database, client, guest, profile_payload):
    headers, user_id = guest
    assert (
        await client.get('/api/v1/training-plans/current', headers=headers)
    ).status_code == 404
    assert (
        await client.post('/api/v1/training-plans/generate', headers=headers)
    ).status_code == 404
    await client.put('/api/v1/profile', headers=headers, json=profile_payload)
    first = await client.post('/api/v1/training-plans/generate', headers=headers)
    assert first.status_code == 200
    a = first.json()
    assert a['source'] == 'deterministic' and len(a['items']) == 3
    assert a['items'][0]['exercise']['key'] == 'bodyweight_squat'
    assert 'user_id' not in a and 'plan_id' not in a['items'][0]
    second = (await client.post('/api/v1/training-plans/generate', headers=headers)).json()
    assert second['id'] != a['id']
    assert (
        await client.get('/api/v1/training-plans/current', headers=headers)
    ).json() == second
    old = await models.training_plans.plan_get(uuid.UUID(user_id), uuid.UUID(a['id']))
    assert old['status'] == 'archived'
    with pytest.raises(models.PlanDoesNotExist):
        await models.training_plans.plan_get(uuid.uuid4(), uuid.UUID(a['id']))
    await client.put(
        '/api/v1/profile',
        headers=headers,
        json={**profile_payload, 'confirmed_constraints': ['avoid_deep_knee_flexion']},
    )
    error = await client.post('/api/v1/training-plans/generate', headers=headers)
    assert error.status_code == 409
    assert error.json()['status'] == 'no_eligible_exercises'
    assert (await models.training_plans.plan_get(uuid.UUID(user_id)))['id'] == uuid.UUID(
        second['id']
    )


async def test_atomic_failure_and_concurrent_generation(
    database, client, guest, profile_payload
):
    headers, user_id = guest
    user_id = uuid.UUID(user_id)
    await client.put('/api/v1/profile', headers=headers, json=profile_payload)
    await client.post('/api/v1/training-plans/generate', headers=headers)
    original = await models.training_plans.plan_get(user_id)
    plan = controllers.training_plans.build_weekly_plan(
        profile_payload, await models.exercises.exercise_list(), datetime.date.today()
    )
    invalid = [{**item, 'exercise_id': str(uuid.uuid4())} for item in plan['items']]
    with pytest.raises(sa.exc.IntegrityError):
        await models.training_plans.plan_create_active(user_id, plan['plan'], invalid)
    assert (await models.training_plans.plan_get(user_id)) == original
    results = await asyncio.gather(
        *[
            models.training_plans.plan_create_active(user_id, plan['plan'], plan['items'])
            for _ in range(3)
        ]
    )
    assert len({row['id'] for row in results}) == 3
    async with database.connect() as conn:
        rows = (
            await conn.execute(
                models.training_plans.TrainingPlans.select().where(
                    models.training_plans.TrainingPlans.c.user_id == user_id,
                    models.training_plans.TrainingPlans.c.status == 'active',
                )
            )
        ).all()
        assert len(rows) == 1
    with pytest.raises(sa.exc.IntegrityError):
        async with database.begin() as conn:
            await conn.execute(
                models.training_plans.TrainingPlans.insert().values(
                    user_id=user_id,
                    status='active',
                    source='deterministic',
                    starts_on=datetime.date.today(),
                    rationale='test',
                    generator_version='deterministic-v1',
                )
            )


async def test_plan_conflict_mapping(monkeypatch, profile_payload):
    monkeypatch.setattr(
        controllers.profiles, 'get_profile', AsyncMock(return_value=profile_payload)
    )
    exercise = {'id': uuid.uuid4(), 'key': 'bodyweight_squat'}
    monkeypatch.setattr(models.exercises, 'exercise_list', AsyncMock(return_value=[exercise]))
    monkeypatch.setattr(controllers.exercises, 'eligible_exercises', lambda *args: [exercise])
    monkeypatch.setattr(
        models.training_plans,
        'plan_create_active',
        AsyncMock(side_effect=models.PlanGenerationConflict),
    )
    with pytest.raises(exceptions.HTTPConflictException):
        await controllers.training_plans.generate(
            schemas.UserCurrent(id=uuid.uuid4(), email=None)
        )


def test_plan_enum_parity():
    for column, enum in [
        ('status', schemas.training_plans.PlanStatusEnum),
        ('source', schemas.training_plans.PlanSourceEnum),
    ]:
        assert set(models.training_plans.TrainingPlans.c[column].type.enums) == {
            v.value for v in enum
        }
