"""Tests for src/core/config.py."""

import pytest

from src.core.config import Settings
from src.core.config import clear_settings_cache
from src.core.config import get_settings


def test_get_settings_returns_settings_instance():
    s = get_settings()
    assert isinstance(s, Settings)


def test_get_settings_is_cached():
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2


def test_cors_origins_list_empty_when_not_set(monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 'test-secret-key-at-least-16-chars')
    monkeypatch.setenv('DATABASE_URL', 'postgresql+asyncpg://x:x@localhost/db')
    monkeypatch.delenv('CORS_ORIGINS', raising=False)
    clear_settings_cache()
    s = Settings(
        SECRET_KEY='test-secret-key-at-least-16-chars',
        DATABASE_URL='postgresql+asyncpg://x:x@localhost/db',
        CORS_ORIGINS='',
    )
    assert s.cors_origins_list() == []


def test_cors_origins_list_parsed():
    s = Settings(
        SECRET_KEY='test-secret-key-at-least-16-chars',
        DATABASE_URL='postgresql+asyncpg://x:x@localhost/db',
        CORS_ORIGINS='http://localhost:3000, http://localhost:5173',
    )
    assert s.cors_origins_list() == ['http://localhost:3000', 'http://localhost:5173']


def test_secret_key_too_short_raises():
    with pytest.raises(Exception, match='SECRET_KEY'):  # noqa: B017
        Settings(
            SECRET_KEY='short',
            DATABASE_URL='postgresql+asyncpg://x:x@localhost/db',
        )


def test_database_url_str():
    s = Settings(
        SECRET_KEY='test-secret-key-at-least-16-chars',
        DATABASE_URL='postgresql+asyncpg://user:pass@host/db',
    )
    assert s.database_url_str() == 'postgresql+asyncpg://user:pass@host/db'


def test_max_upload_bytes():
    s = Settings(
        SECRET_KEY='test-secret-key-at-least-16-chars',
        DATABASE_URL='postgresql+asyncpg://x:x@localhost/db',
        MAX_UPLOAD_SIZE_MB=5,
    )
    assert s.max_upload_bytes == 5 * 1024 * 1024


def test_is_production_false_by_default():
    s = Settings(
        SECRET_KEY='test-secret-key-at-least-16-chars',
        DATABASE_URL='postgresql+asyncpg://x:x@localhost/db',
    )
    assert s.is_production is False


def test_is_production_true_when_env_is_production():
    s = Settings(
        SECRET_KEY='test-secret-key-at-least-16-chars',
        DATABASE_URL='postgresql+asyncpg://x:x@localhost/db',
        APP_ENV='production',
    )
    assert s.is_production is True


@pytest.mark.parametrize('enabled', [False, True])
def test_canonical_provider_keys_require_feature_flags_and_remain_private(
    monkeypatch, enabled
):
    monkeypatch.setenv('OPENAI_API_KEY', 'mock-openai-key')
    monkeypatch.setenv('ELEVENLABS_API_KEY', 'mock-elevenlabs-key')
    # Historical names may coexist, but application code consumes canonical fields.
    monkeypatch.setenv('API_TOKEN', 'legacy-unused-value')
    monkeypatch.setenv('ELEVENLABS_TOKEN', 'legacy-unused-value')
    settings = Settings(
        _env_file=None,
        SECRET_KEY='test-secret-key-at-least-16-chars',
        DATABASE_URL='postgresql+asyncpg://unused/unused',
        AI_FEATURE_ENABLED=enabled,
        ELEVENLABS_ENABLED=enabled,
        OPENAI_MODEL='gpt-5.4',
    )
    assert settings.OPENAI_API_KEY.get_secret_value() == 'mock-openai-key'
    assert settings.ELEVENLABS_API_KEY.get_secret_value() == 'mock-elevenlabs-key'
    assert settings.ai_available is enabled
    assert settings.elevenlabs_available is enabled
    assert 'mock-openai-key' not in repr(settings)
    assert 'mock-elevenlabs-key' not in repr(settings)
