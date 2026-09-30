import ast
import datetime
import uuid
from pathlib import Path

import pytest

from src.api import permission
from src.core import security
from src.main import app

ROUTES = [
    ('get', '/api/v1/profile', permission.Perm.PROFILE_READ),
    ('put', '/api/v1/profile', permission.Perm.PROFILE_UPDATE),
    ('get', '/api/v1/exercises', permission.Perm.EXERCISE_READ),
    ('get', '/api/v1/training-plans/current', permission.Perm.PLAN_READ),
    ('post', '/api/v1/training-plans/generate', permission.Perm.PLAN_GENERATE),
    ('post', '/api/v1/workout-sessions', permission.Perm.SESSION_WRITE),
    (
        'post',
        '/api/v1/workout-sessions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sets',
        permission.Perm.SESSION_WRITE,
    ),
    (
        'post',
        '/api/v1/workout-sessions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/complete',
        permission.Perm.SESSION_WRITE,
    ),
    ('get', '/api/v1/progress/summary', permission.Perm.PROGRESS_READ),
]


@pytest.mark.parametrize('method,path,perm', ROUTES)
async def test_domain_auth_permissions(client, method, path, perm):
    user = {
        'id': str(uuid.uuid4()),
        'email': None,
        'permissions': [p.value for p in permission.Perm if p != perm],
    }
    token = security.create_access_token(user)
    assert (
        await getattr(client, method)(path, headers={'Authorization': 'Bearer ' + token})
    ).status_code == 403
    for token in ['bad', security.create_access_token(user, datetime.timedelta(seconds=-1))]:
        assert (
            await getattr(client, method)(path, headers={'Authorization': 'Bearer ' + token})
        ).status_code == 401
    assert (await getattr(client, method)(path)).status_code == 401


@pytest.mark.xdist_group('domains')
async def test_superuser_bypass_and_raw_payload_rejection(
    database,
    client,
    guest,
    profile_payload,
    session_payload,
    set_payload,
    completion_payload,
    caplog,
):
    headers, user_id = guest
    await client.put('/api/v1/profile', json=profile_payload, headers=headers)
    token = security.create_access_token(
        {'id': user_id, 'email': None, 'is_superuser': True, 'permissions': []}
    )
    assert (
        await client.get('/api/v1/profile', headers={'Authorization': 'Bearer ' + token})
    ).status_code == 200
    paths = [
        ('/api/v1/workout-sessions', session_payload),
        ('/api/v1/workout-sessions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sets', set_payload),
        (
            '/api/v1/workout-sessions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/complete',
            completion_payload,
        ),
    ]
    sentinel = 'private-observation-must-not-leak'
    for path, body in paths:
        for field in ['landmarks', 'frames', 'video', 'image', 'screenshot', 'user_id']:
            response = await client.post(path, json={**body, field: sentinel}, headers=headers)
            assert response.status_code == 422
            assert response.json()['detail'] == 'Validation error'
            assert sentinel not in response.text
            assert all('input' not in error for error in response.json()['errors'])
    body = {
        **completion_payload,
        'summary': {**completion_payload['summary'], 'video': sentinel},
    }
    assert (await client.post(paths[-1][0], json=body, headers=headers)).status_code == 422
    assert sentinel not in caplog.text and token not in caplog.text


def test_domain_route_docs_and_layer_contracts():
    openapi = app.openapi()
    for method, path, _ in ROUTES:
        schema_path = path.replace('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{session_id}')
        operation = openapi['paths'][schema_path][method]
        assert operation['summary'] and operation['responses']['200']['description']
        assert 'application/json' in operation['responses']['200']['content']
        assert 'security' in operation
    for layer in ['controllers', 'v1/endpoints']:
        for path in Path('src/api', layer).glob('*.py'):
            tree = ast.parse(path.read_text())
            assert not any(
                isinstance(node, ast.Attribute)
                and node.attr
                in {'fetch_one', 'fetch_all', 'execute', 'transaction', 'with_for_update'}
                for node in ast.walk(tree)
            ), path
    for path in Path('src/migrations/postgres/versions').glob('*.py'):
        tree = ast.parse(path.read_text())
        downgrade = next(
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name == 'downgrade'
        )
        assert len(downgrade.body) == 1 and isinstance(downgrade.body[0], ast.Pass)
    for path in Path('src/api/models').glob('*.py'):
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.AsyncFunctionDef):
                assert any(
                    isinstance(decorator, ast.Attribute) and decorator.attr == 'session'
                    for decorator in node.decorator_list
                ), path
            assert not (
                isinstance(node, ast.Attribute)
                and node.attr in {'with_for_update', 'text', 'model_dump'}
            ), path
