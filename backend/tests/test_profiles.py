import uuid

import pydantic
import pytest
import sqlalchemy as sa

from src.api import models
from src.api import schemas
from src.core import security

pytestmark = [pytest.mark.xdist_group('domains')]


@pytest.mark.parametrize(
    'field,value',
    [
        ('days_per_week', 0),
        ('days_per_week', 8),
        ('session_minutes', 4),
        ('session_minutes', 121),
        ('timezone', 'Bad/Zone'),
        ('timezone', '../bad'),
        ('locale', 'bad_locale'),
        ('equipment', ['none', 'dumbbells']),
        ('equipment', ['chair', 'chair']),
        ('confirmed_constraints', ['unknown']),
        ('confirmed_constraints', ['no_high_impact', 'no_high_impact']),
        ('user_id', str(uuid.uuid4())),
    ],
)
def test_invalid_profiles(profile_payload, field, value):
    with pytest.raises(pydantic.ValidationError):
        schemas.profiles.ProfileUpdate(**{**profile_payload, field: value})


async def test_replace_get_isolation_constraints_and_cascade(
    database, client, guest, profile_payload
):
    headers, user_id = guest
    assert (await client.get('/api/v1/profile', headers=headers)).status_code == 404
    first = {**profile_payload, 'confirmed_constraints': ['no_high_impact', 'avoid_overhead']}
    response = await client.put('/api/v1/profile', json=first, headers=headers)
    assert response.status_code == 200
    assert set(response.json()['confirmed_constraints']) == set(first['confirmed_constraints'])
    second = {
        **profile_payload,
        'days_per_week': 2,
        'equipment': ['dumbbells'],
        'confirmed_constraints': ['avoid_deep_knee_flexion'],
    }
    assert (
        await client.put('/api/v1/profile', json=second, headers=headers)
    ).status_code == 200
    result = (await client.get('/api/v1/profile', headers=headers)).json()
    assert {key: result[key] for key in second} == second
    assert result['created_at'] == response.json()['created_at']
    assert 'user_id' not in result
    other = (await client.post('/api/v1/auth/guest')).json()
    other_headers = {'Authorization': 'Bearer ' + other['access_token']}
    assert (await client.get('/api/v1/profile', headers=other_headers)).status_code == 404
    assert (
        await client.put('/api/v1/profile', json={'goal': 'mobility'}, headers=headers)
    ).status_code == 422
    async with database.begin() as conn:
        await conn.execute(
            models.profiles.HealthConstraints.insert().values(
                user_id=uuid.UUID(user_id),
                code='no_high_impact',
                source='document_extracted',
                status='pending_confirmation',
            )
        )
    assert (await client.get('/api/v1/profile', headers=headers)).json()[
        'confirmed_constraints'
    ] == ['avoid_deep_knee_flexion']
    assert type(await models.profiles.profile_get(uuid.UUID(user_id))) is dict
    async with database.begin() as conn:
        await conn.execute(
            models.users.Users.delete().where(models.users.Users.c.id == uuid.UUID(user_id))
        )
        assert not (
            await conn.execute(
                sa.select(models.profiles.HealthConstraints).where(
                    models.profiles.HealthConstraints.c.user_id == uuid.UUID(user_id)
                )
            )
        ).all()
    assert (await client.get('/api/v1/profile', headers=headers)).status_code == 404
    assert (
        await client.put('/api/v1/profile', json=profile_payload, headers=headers)
    ).status_code == 401


async def test_profile_permissions_and_db_constraints(
    database, client, guest, profile_payload
):
    _, user_id = guest
    token = security.create_access_token({'id': user_id, 'email': None, 'permissions': []})
    for method in ['get', 'put']:
        response = await getattr(client, method)(
            '/api/v1/profile',
            headers={'Authorization': 'Bearer ' + token},
            **({'json': profile_payload} if method == 'put' else {}),
        )
        assert response.status_code == 403
    with pytest.raises(sa.exc.IntegrityError):
        async with database.begin() as conn:
            await conn.execute(
                models.profiles.Profiles.insert().values(
                    user_id=uuid.UUID(user_id),
                    **{
                        **{
                            key: value
                            for key, value in profile_payload.items()
                            if key != 'confirmed_constraints'
                        },
                        'days_per_week': 0,
                    },
                )
            )


def test_profile_enum_parity():
    for column, enum in [
        ('goal', schemas.profiles.GoalEnum),
        ('experience_level', schemas.profiles.ExperienceEnum),
    ]:
        assert set(models.profiles.Profiles.c[column].type.enums) == {v.value for v in enum}
    for column, enum in [
        ('code', schemas.profiles.ConstraintCodeEnum),
        ('source', schemas.profiles.ConstraintSourceEnum),
        ('status', schemas.profiles.ConstraintStatusEnum),
    ]:
        assert set(models.profiles.HealthConstraints.c[column].type.enums) == {
            v.value for v in enum
        }
