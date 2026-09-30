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
    OPENAI_MODEL: str = 'gpt-5.4'
    OPENAI_EMBEDDING_MODEL: str = 'text-embedding-3-small'
    OPENAI_TIMEOUT_SECONDS: float = pydantic.Field(default=30, gt=0, le=60)
    OPENAI_MAX_RETRIES: int = pydantic.Field(default=1, ge=0, le=1)
    ENABLE_DEMO_PERSONAS: bool = False
    RAG_TOP_K: int = pydantic.Field(default=5, ge=1, le=5)
    RAG_CHUNK_SIZE: int = pydantic.Field(default=1600, ge=1200, le=1800)
    RAG_CHUNK_OVERLAP: int = pydantic.Field(default=200, ge=150, le=250)
    MAX_DOCUMENTS_PER_USER: int = pydantic.Field(default=5, ge=1, le=5)
    MAX_DOCUMENT_SIZE_MB: int = pydantic.Field(default=5, ge=1, le=5)
    MAX_EXTRACTED_CHARS: int = pydantic.Field(default=50000, ge=1, le=50000)

    OPENAI_REASONING_EFFORT_CHAT: typing.Literal['none', 'low', 'medium', 'high'] = 'low'
    OPENAI_REASONING_EFFORT_PLAN: typing.Literal['none', 'low', 'medium', 'high'] = 'medium'
    OPENAI_OUTPUT_CHAT: int = pydantic.Field(default=1800, ge=256, le=4000)
    OPENAI_OUTPUT_PROFILE: int = pydantic.Field(default=4000, ge=512, le=8000)
    OPENAI_OUTPUT_PLAN: int = pydantic.Field(default=8000, ge=512, le=16000)
    OPENAI_OUTPUT_SPEC: int = pydantic.Field(default=10000, ge=512, le=16000)
    COACH_EXECUTION_MODE: typing.Literal['live', 'fixture', 'fallback'] = 'live'
    ENABLE_FIXTURE_MODE: bool = False
    COACH_MAX_TOOL_ROUNDS: int = pydantic.Field(default=4, ge=1, le=4)
    PROVIDER_IP_DAILY_REQUEST_CAP: int = pydantic.Field(default=300, ge=1, le=5000)
    OPENAI_MAX_CONCURRENCY: int = pydantic.Field(default=4, ge=1, le=8)
    COACH_DAILY_REQUEST_CAP: int = pydantic.Field(default=60, ge=1, le=1000)
    GENERATION_JOB_TIMEOUT_SECONDS: int = pydantic.Field(default=180, ge=30, le=600)
    GENERATION_JOB_CONCURRENCY: int = pydantic.Field(default=1, ge=1, le=4)
    ELEVENLABS_ENABLED: bool = True
    ELEVENLABS_API_KEY: pydantic.SecretStr = pydantic.Field(default='')
    ELEVENLABS_MODEL_RU: str = 'eleven_flash_v2_5'
    ELEVENLABS_MODEL_EN: str = 'eleven_flash_v2_5'
    ELEVENLABS_MODEL_KK: str = 'eleven_v3'
    ELEVENLABS_DEFAULT_VOICE_ID: str = ''
    ELEVENLABS_ALLOWED_VOICE_IDS: str = ''
    ELEVENLABS_OUTPUT_FORMAT: str = 'mp3_44100_128'
    ELEVENLABS_TIMEOUT_SECONDS: float = pydantic.Field(default=20, gt=0, le=60)
    ELEVENLABS_BATCH_TIMEOUT_SECONDS: float = pydantic.Field(default=120, gt=0, le=180)
    ELEVENLABS_MAX_CONCURRENCY: int = pydantic.Field(default=2, ge=1, le=4)
    VOICE_INPUT_ENABLED: bool = True
    OPENAI_TRANSCRIBE_MODEL: str = 'gpt-4o-mini-transcribe'
    VOICE_INPUT_MAX_SECONDS: int = pydantic.Field(default=30, ge=1, le=30)
    VOICE_INPUT_MAX_BYTES: int = pydantic.Field(default=4194304, ge=1024, le=4194304)
    AUDIO_CACHE_MAX_MB: int = pydantic.Field(default=100, ge=1, le=500)
    AUDIO_SHARED_CACHE_DIR: str = ''
    AUDIO_SHARED_CACHE_MAX_MB: int = pydantic.Field(default=1024, ge=1, le=4096)
    PERSONAL_AUDIO_TTL_SECONDS: int = pydantic.Field(default=3600, ge=60, le=86400)
    AUDIO_DAILY_CHARACTER_CAP: int = pydantic.Field(default=10000, ge=100, le=100000)
    GOOGLE_CALENDAR_ENABLED: bool = False
    GOOGLE_CLIENT_ID: str = ''
    GOOGLE_CLIENT_SECRET: pydantic.SecretStr = pydantic.Field(default='')
    GOOGLE_REDIRECT_URI: str = ''
    OAUTH_TOKEN_ENCRYPTION_KEY: pydantic.SecretStr = pydantic.Field(default='')
    GUEST_REFRESH_TTL_DAYS: int = pydantic.Field(default=7, ge=1, le=30)
    APP_PUBLIC_URL: str = ''

    @property
    def elevenlabs_available(self) -> bool:
        return bool(self.ELEVENLABS_ENABLED and self.ELEVENLABS_API_KEY.get_secret_value())

    @property
    def google_available(self) -> bool:
        return bool(
            self.GOOGLE_CALENDAR_ENABLED
            and self.GOOGLE_CLIENT_ID
            and self.GOOGLE_CLIENT_SECRET.get_secret_value()
            and self.GOOGLE_REDIRECT_URI
            and self.OAUTH_TOKEN_ENCRYPTION_KEY.get_secret_value()
        )

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
