"""Test configuration and shared fixtures."""

import os

import httpx
import pytest
import pytest_asyncio

# Provide a test SECRET_KEY before any src imports happen.
os.environ.setdefault('SECRET_KEY', 'test-secret-key-that-is-long-enough-32chars')
os.environ.setdefault(
    'DATABASE_URL', 'postgresql+asyncpg://postgres:postgres@localhost:5432/dungeon_master'
)


from src.core.config import clear_settings_cache
from src.main import app


@pytest_asyncio.fixture
async def client() -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url='http://test',
    ) as c:
        yield c


@pytest.fixture(autouse=True)
def reset_settings_cache():
    yield
    clear_settings_cache()


@pytest.fixture(scope='session')
def disposable_database_url():
    """Create a UUID-named DB; never clear the configured database."""
    import subprocess
    import sys
    import uuid

    from sqlalchemy.engine import make_url

    from src.core.config import get_settings

    settings = get_settings()
    value = os.environ.get('TEST_DATABASE_URL') or settings.test_database_url_str()
    if not value:
        pytest.fail('Set TEST_DATABASE_URL to a separate local *_test database')
    url = make_url(value)
    if (
        settings.is_production
        or not url.username
        or url.host not in {'localhost', '127.0.0.1', 'postgres'}
        or not url.database
        or not url.database.endswith('_test')
        or url == make_url(os.environ['DATABASE_URL'])
    ):
        pytest.fail('Set TEST_DATABASE_URL to a separate local *_test database')
    name = 'dungeon_sprint3_' + uuid.uuid4().hex + '_test'
    env = dict(os.environ, PGPASSWORD=url.password or '')
    args = ['-h', url.host, '-p', str(url.port or 5432), '-U', url.username]
    subprocess.run(
        ['createdb', *args, '--template=template0', '--encoding=UTF8', name],
        env=env,
        check=True,
        capture_output=True,
    )
    try:
        env['DATABASE_URL'] = url.set(database=name).render_as_string(hide_password=False)
        env['DEBUG'] = 'false'
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
        yield env['DATABASE_URL']
    finally:
        subprocess.run(['dropdb', *args, name], env=env, check=True, capture_output=True)


@pytest_asyncio.fixture
async def database(disposable_database_url, monkeypatch):
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool

    from src.core import postgres

    engine = create_async_engine(
        disposable_database_url, poolclass=NullPool, hide_parameters=True
    )
    monkeypatch.setattr(postgres, '_engine', engine)
    yield engine
    await engine.dispose()


def pytest_configure(config):
    config.addinivalue_line('markers', 'xdist_group(name): keep disposable DB tests together')


@pytest_asyncio.fixture
async def guest(database, client):
    response = await client.post('/api/v1/auth/guest')
    assert response.status_code == 200
    data = response.json()
    return {'Authorization': 'Bearer ' + data['access_token']}, data['user']['id']


@pytest.fixture
def profile_payload():
    return {
        'goal': 'general_fitness',
        'experience_level': 'beginner',
        'days_per_week': 3,
        'session_minutes': 20,
        'equipment': ['none'],
        'locale': 'ru-RU',
        'timezone': 'Asia/Almaty',
        'confirmed_constraints': [],
    }


@pytest.fixture
def session_payload():
    import uuid

    return {
        'client_session_id': str(uuid.uuid4()),
        'plan_id': None,
        'started_at': '2026-09-30T00:00:00Z',
        'client_engine_version': 'squat-v1',
    }


@pytest.fixture
def set_payload():
    import uuid

    return {
        'client_set_id': str(uuid.uuid4()),
        'exercise_key': 'bodyweight_squat',
        'set_index': 1,
        'total_reps': 5,
        'accepted_reps': 3,
        'duration_ms': 27000,
        'error_counts': {'depth_insufficient': 1, 'too_fast': 1, 'incomplete_extension': 0},
        'metrics': {'mean_rep_duration_ms': 5400, 'mean_min_knee_angle': 108.4},
        'engine_version': 'squat-v1',
    }


@pytest.fixture
def completion_payload(set_payload):
    return {
        'completed_at': '2026-09-30T00:00:27Z',
        'summary': {
            **{
                key: set_payload[key]
                for key in ['total_reps', 'accepted_reps', 'duration_ms', 'error_counts']
            },
            'rejected_reps': 2,
        },
    }
