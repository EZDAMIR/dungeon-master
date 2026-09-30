"""Regression checks for the implemented backend's folder conventions."""

import ast
import datetime
import uuid
from pathlib import Path
from unittest.mock import AsyncMock

import pydantic
import pytest
import pytest_asyncio
import sqlalchemy as sa

from src.api import controllers
from src.api import models
from src.api import schemas
from src.api.schemas import fields
from src.core import postgres
from src.main import app

TEXT_BOUNDS = [
    ('users', 'email', 254),
    ('users', 'display_name', 100),
    ('profiles', 'locale', 35),
    ('profiles', 'timezone', 100),
    ('health_constraints', 'note', 500),
    ('exercises', 'key', 80),
    ('exercises', 'name', 100),
    ('training_plans', 'rationale', 500),
    ('training_plans', 'generator_version', 50),
    ('training_plan_items', 'tempo_hint', 80),
    ('workout_sessions', 'client_engine_version', 50),
]


def test_text_metadata_and_domain_layer_boundaries():
    for table_name, column, _ in TEXT_BOUNDS:
        table = postgres.metadata.tables[table_name]
        assert isinstance(table.c[column].type, sa.Text)
        assert f'ck_{table_name}_{column}_length' in {c.name for c in table.constraints}
    for path in Path('src/api/controllers').glob('*.py'):
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                assert all(
                    alias.name not in {'postgres', 'sqlalchemy'} for alias in node.names
                )
            if isinstance(node, ast.ClassDef):
                assert not any(
                    isinstance(base, ast.Name) and base.id == 'Exception'
                    for base in node.bases
                )


@pytest_asyncio.fixture
async def persisted_rows(
    database, client, guest, profile_payload, session_payload, set_payload
):
    headers, user_id = guest
    user_id = uuid.UUID(user_id)
    profile = {**profile_payload, 'confirmed_constraints': ['avoid_overhead']}
    assert (
        await client.put('/api/v1/profile', headers=headers, json=profile)
    ).status_code == 200
    generated = await client.post('/api/v1/training-plans/generate', headers=headers)
    assert generated.status_code == 200
    plan = generated.json()
    created = await client.post(
        '/api/v1/workout-sessions', headers=headers, json=session_payload
    )
    assert created.status_code == 200
    session_id = created.json()['id']
    saved = await client.post(
        f'/api/v1/workout-sessions/{session_id}/sets', headers=headers, json=set_payload
    )
    assert saved.status_code == 200
    async with database.connect() as connection:
        constraint_id = (
            await connection.execute(
                sa.select(models.profiles.HealthConstraints.c.id).where(
                    models.profiles.HealthConstraints.c.user_id == user_id
                )
            )
        ).scalar_one()
        catalog = (
            (
                await connection.execute(
                    models.exercises.Exercises.select().where(
                        models.exercises.Exercises.c.id
                        == uuid.UUID(plan['items'][0]['exercise_id'])
                    )
                )
            )
            .mappings()
            .one()
        )
    yield {
        'users': user_id,
        'profiles': user_id,
        'health_constraints': constraint_id,
        'exercises': uuid.UUID(plan['items'][0]['exercise_id']),
        'training_plans': uuid.UUID(plan['id']),
        'training_plan_items': uuid.UUID(plan['items'][0]['id']),
        'workout_sessions': uuid.UUID(session_id),
    }
    async with database.begin() as connection:
        await connection.execute(
            models.exercises.Exercises.update()
            .where(models.exercises.Exercises.c.id == catalog['id'])
            .values(key=catalog['key'], name=catalog['name'])
        )


@pytest.mark.xdist_group('domains')
@pytest.mark.parametrize('table_name,column,bound', TEXT_BOUNDS)
async def test_text_storage_preserves_character_limits(
    database, persisted_rows, table_name, column, bound
):
    table = postgres.metadata.tables[table_name]
    pk = next(iter(table.primary_key.columns))
    row_id = persisted_rows[table_name]
    # Preserve VARCHAR's character semantics, including multibyte characters.
    value = 'я' * bound
    async with database.begin() as connection:
        await connection.execute(table.update().where(pk == row_id).values({column: value}))
        checks = await connection.run_sync(
            lambda sync: sa.inspect(sync).get_check_constraints(table_name)
        )
        assert f'ck_{table_name}_{column}_length' in {check['name'] for check in checks}
    with pytest.raises(sa.exc.IntegrityError) as error:
        async with database.begin() as connection:
            await connection.execute(
                table.update().where(pk == row_id).values({column: value + 'я'})
            )
    assert error.value.orig.__cause__.constraint_name == f'ck_{table_name}_{column}_length'
    async with database.begin() as connection:
        actual = (
            await connection.execute(sa.select(table.c[column]).where(pk == row_id))
        ).scalar_one()
        assert actual == value
        if table.c[column].nullable:
            await connection.execute(table.update().where(pk == row_id).values({column: None}))


async def test_set_controller_sends_only_persistence_fields(monkeypatch, set_payload):
    persist = AsyncMock(return_value={'id': uuid.uuid4()})
    monkeypatch.setattr(models.workout_sessions, 'set_create', persist)
    user = schemas.UserCurrent(id=uuid.uuid4(), email=None)
    session_id = uuid.uuid4()
    body = schemas.workout_sessions.WorkoutSetCreate.model_validate(set_payload)
    result = await controllers.workout_sessions.add_set(user, session_id, body)
    assert result == persist.return_value
    expected = {
        key: value
        for key, value in set_payload.items()
        if key not in {'exercise_key', 'engine_version'}
    }
    expected['generic_error_counts'] = {}
    expected.update(
        assessment_mode='camera',
        completion_status='completed',
        spec_revision=None,
        target_snapshot=None,
    )
    persist.assert_awaited_once_with(
        user.id,
        session_id,
        expected,
        exercise_key='bodyweight_squat',
        engine_version='squat-v1',
    )
    assert expected == persist.call_args.args[2]


def test_request_response_schemas_share_base_fields(profile_payload, set_payload):
    timestamp = datetime.datetime(2026, 9, 30, tzinfo=datetime.UTC)
    profile_row = {
        **profile_payload,
        'user_id': uuid.uuid4(),
        'created_at': timestamp,
        'updated_at': timestamp,
    }
    assert (
        schemas.profiles.ProfileGet.model_validate(profile_row).goal.value
        == profile_payload['goal']
    )
    with pytest.raises(pydantic.ValidationError):
        schemas.profiles.ProfileUpdate.model_validate(profile_row)
    set_row = {
        **set_payload,
        'id': uuid.uuid4(),
        'session_id': uuid.uuid4(),
        'created_at': timestamp,
        'updated_at': timestamp,
    }
    assert schemas.workout_sessions.WorkoutSetGet.model_validate(set_row).accepted_reps == 3
    with pytest.raises(pydantic.ValidationError):
        schemas.workout_sessions.WorkoutSetCreate.model_validate(set_row)
    assert not issubclass(schemas.profiles.ProfileGet, schemas.profiles.ProfileUpdate)
    assert not issubclass(
        schemas.workout_sessions.WorkoutSetGet, schemas.workout_sessions.WorkoutSetCreate
    )


@pytest.mark.parametrize(
    'value',
    [
        [],
        'string',
        {'raw': object()},
        {'metric': float('nan')},
        {'metric': float('inf')},
        {'payload': 'x' * 65_536},
    ],
)
def test_generic_dict_rejects_invalid_json_and_oversize_values(value):
    adapter = pydantic.TypeAdapter(fields.Dict)
    with pytest.raises(pydantic.ValidationError):
        adapter.validate_python(value)


def test_generic_dict_accepts_json_objects():
    value = {'nested': {'codes': ['allowed'], 'count': 1}, 'optional': None}
    assert pydantic.TypeAdapter(fields.Dict).validate_python(value) == value


@pytest.mark.parametrize(
    'field,value', [('completed_sessions', -1), ('total_reps', '5'), ('accepted_reps', True)]
)
def test_progress_response_rejects_corrupt_counts(field, value):
    data = {
        'completed_sessions': 0,
        'total_reps': 0,
        'accepted_reps': 0,
        'rejected_reps': 0,
        'acceptance_rate': 0,
        'error_counts': {'depth_insufficient': 0, 'too_fast': 0, 'incomplete_extension': 0},
        'recent_sessions': [],
    }
    with pytest.raises(pydantic.ValidationError):
        schemas.progress.ProgressSummary.model_validate({**data, field: value})


def test_custom_error_statuses_are_documented():
    schema = app.openapi()
    for path, method, code, response in [
        ('/api/v1/profile', 'get', '404', 'ProfileRequiredResponse'),
        ('/api/v1/exercises', 'get', '404', 'ProfileRequiredResponse'),
        ('/api/v1/training-plans/generate', 'post', '404', 'ProfileRequiredResponse'),
        ('/api/v1/workout-sessions', 'post', '409', 'SessionConflictResponse'),
        (
            '/api/v1/workout-sessions/{session_id}/sets',
            'post',
            '409',
            'SessionConflictResponse',
        ),
        (
            '/api/v1/workout-sessions/{session_id}/complete',
            'post',
            '409',
            'SessionConflictResponse',
        ),
    ]:
        body = schema['paths'][path][method]['responses'][code]['content']['application/json'][
            'schema'
        ]
        assert body == {'$ref': f'#/components/schemas/{response}'}
        assert 'status' in schema['components']['schemas'][response]['required']
