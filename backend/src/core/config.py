import functools
import typing

import pydantic
import pydantic_settings


class Settings(pydantic_settings.BaseSettings):
    model_config = pydantic_settings.SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        case_sensitive=True,
        extra='ignore',
    )

    APP_NAME: str = 'dungeon-master'
    APP_ENV: str = 'development'
    DEBUG: bool = False
    API_V1_PREFIX: str = '/api/v1'

    # Must be set in production
    SECRET_KEY: str

    DATABASE_URL: pydantic.SecretStr
    TEST_DATABASE_URL: pydantic.SecretStr = pydantic.Field(default='')

    # Comma-separated list of allowed CORS origins
    CORS_ORIGINS: str = ''

    LOG_LEVEL: str = 'INFO'
    HTTP_CLIENT_TIMEOUT: float = 30.0

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    MAX_UPLOAD_SIZE_MB: int = 10

    AI_FEATURE_ENABLED: bool = False
    OPENAI_API_KEY: pydantic.SecretStr = pydantic.Field(default='')
    OPENAI_MODEL: str = ''
    OPENAI_EMBEDDING_MODEL: str = ''
    OPENAI_TIMEOUT_SECONDS: float = pydantic.Field(default=30, gt=0, le=60)
    OPENAI_MAX_RETRIES: int = pydantic.Field(default=1, ge=0, le=1)
    ENABLE_DEMO_PERSONAS: bool = False
    RAG_TOP_K: int = pydantic.Field(default=5, ge=1, le=5)
    RAG_CHUNK_SIZE: int = pydantic.Field(default=1600, ge=1200, le=1800)
    RAG_CHUNK_OVERLAP: int = pydantic.Field(default=200, ge=150, le=250)
    MAX_DOCUMENTS_PER_USER: int = pydantic.Field(default=5, ge=1, le=5)
    MAX_DOCUMENT_SIZE_MB: int = pydantic.Field(default=5, ge=1, le=5)
    MAX_EXTRACTED_CHARS: int = pydantic.Field(default=50000, ge=1, le=50000)

    @property
    def ai_available(self) -> bool:
        return bool(
            self.AI_FEATURE_ENABLED
            and self.OPENAI_API_KEY.get_secret_value()
            and self.OPENAI_MODEL
        )

    @pydantic.field_validator('SECRET_KEY')
    @classmethod
    def secret_key_must_not_be_empty(cls, v: str) -> str:
        if not v or len(v) < 16:
            raise ValueError('SECRET_KEY must be at least 16 characters')
        return v

    def cors_origins_list(self) -> list[str]:
        if not self.CORS_ORIGINS:
            return []
        return [o.strip() for o in self.CORS_ORIGINS.split(',') if o.strip()]

    def database_url_str(self) -> str:
        return self.DATABASE_URL.get_secret_value()

    def test_database_url_str(self) -> str:
        return self.TEST_DATABASE_URL.get_secret_value()

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == 'production'

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@functools.lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()


SettingsT = typing.TypeVar('SettingsT', bound=Settings)
