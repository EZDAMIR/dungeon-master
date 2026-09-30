import copy
import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa

from src.api import controllers
from src.api import models
from src.api import schemas

pytestmark = [pytest.mark.xdist_group('domains')]


async def test_seed_eligibility_api(database, client, guest, profile_payload):
    headers, _ = guest
    assert (await client.get('/api/v1/exercises', headers=headers)).status_code == 404
    await client.put('/api/v1/profile', headers=headers, json=profile_payload)
    catalog = await models.exercises.exercise_list()
    assert len(catalog) == 1
    assert type(catalog[0]) is dict
    result = (await client.get('/api/v1/exercises', headers=headers)).json()
    assert len(result) == 1 and result[0]['key'] == 'bodyweight_squat'
    assert 'created_at' not in result[0] and 'is_active' not in result[0]
    await client.put(
        '/api/v1/profile',
        headers=headers,
        json={**profile_payload, 'confirmed_constraints': ['avoid_deep_knee_flexion']},
    )
    assert (await client.get('/api/v1/exercises', headers=headers)).json() == []
    path = next(Path('src/migrations/postgres/versions').glob('*exercise_catalog*.py'))
    spec = importlib.util.spec_from_file_location('catalog_migration', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    async with database.begin() as conn:
        await conn.run_sync(
            lambda connection: module.seed_squat(connection, models.exercises.Exercises)
        )
    assert len(await models.exercises.exercise_list()) == 1
    with pytest.raises(sa.exc.IntegrityError):
        async with database.begin() as conn:
            await conn.execute(
                models.exercises.Exercises.insert().values(
                    **{key: value for key, value in catalog[0].items() if key != 'id'}
                )
            )


def test_canonical_filter(profile_payload):
    exercise = {
        'key': 'bodyweight_squat',
        'is_active': True,
        'equipment_codes': ['none'],
        'contraindication_tags': ['avoid_deep_knee_flexion'],
        'analysis_profile': {
            'version': 1,
            'engine_key': 'bodyweight_squat_side_v1',
            'engine_version': 'squat-v1',
            'target_reps': 5,
            'supported_client': 'web',
        },
    }
    eligible = controllers.exercises.eligible_exercises
    assert eligible([exercise], profile_payload) == [exercise]
    assert not eligible([{**exercise, 'is_active': False}], profile_payload)
    assert not eligible([{**exercise, 'key': 'unsupported'}], profile_payload)
    assert not eligible([{**exercise, 'equipment_codes': ['dumbbells']}], profile_payload)
    assert eligible(
        [{**exercise, 'equipment_codes': ['dumbbells']}],
        {**profile_payload, 'equipment': ['dumbbells']},
    )
    for field, value in [
        ('analysis_profile', {'landmarks': []}),
        ('equipment_codes', {}),
        ('equipment_codes', []),
        ('equipment_codes', ['unknown']),
        ('contraindication_tags', ['unknown']),
        ('equipment_codes', [{}]),
    ]:
        malformed = copy.deepcopy(exercise)
        malformed[field] = value
        assert not eligible([malformed], profile_payload)


def test_catalog_enum_parity():
    for column, enum in [
        ('difficulty', schemas.profiles.ExperienceEnum),
        ('impact_level', schemas.exercises.ImpactEnum),
        ('camera_angle', schemas.exercises.CameraAngleEnum),
    ]:
        assert set(models.exercises.Exercises.c[column].type.enums) == {v.value for v in enum}
