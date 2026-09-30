import typing
import uuid

import pydantic

from .ai_coach import CoachStyleEnum
from .ai_coach import Language
from .coach import VoiceID
from .movement_spec import StrictObject


class VoiceGet(pydantic.BaseModel):
    voice_id: VoiceID
    name: str
    description: str
    labels: dict[str, str]


class VoicesGet(pydantic.BaseModel):
    voices: list[VoiceGet]
    has_more: bool
    next_page_token: str | None
    model_id: str
    language: Language


class ModelLanguage(pydantic.BaseModel):
    language_id: str
    name: str


class VoiceModel(pydantic.BaseModel):
    model_id: str
    name: str
    languages: list[ModelLanguage]
    can_do_text_to_speech: bool


class VoiceModelsGet(pydantic.BaseModel):
    models: list[VoiceModel]


class PreviewCreate(StrictObject):
    language: Language
    style: CoachStyleEnum


class SpeechCreate(StrictObject):
    cue_id: (
        typing.Annotated[
            str, pydantic.StringConstraints(strict=True, min_length=1, max_length=80)
        ]
        | None
    ) = None
    message_id: uuid.UUID | None = None
    exercise_key: (
        typing.Annotated[
            str, pydantic.StringConstraints(strict=True, min_length=1, max_length=80)
        ]
        | None
    ) = None
    spec_revision: uuid.UUID | None = None

    @pydantic.model_validator(mode='after')
    def one_source(self):
        if (self.cue_id is None) == (self.message_id is None):
            raise ValueError('Exactly one cue or owned saved message is required')
        if (self.exercise_key is None) != (self.spec_revision is None):
            raise ValueError('Exercise cue requires both key and spec revision')
        return self


class PrewarmCreate(StrictObject):
    cue_ids: typing.Annotated[list[str], pydantic.Field(min_length=1, max_length=8)]
    exercise_key: str | None = None
    spec_revision: uuid.UUID | None = None


class PrewarmGet(pydantic.BaseModel):
    prepared: list[str]
    failed: list[str]


class TranscriptionGet(pydantic.BaseModel):
    text: str
    provenance: dict[str, str]


class Capability(pydantic.BaseModel):
    configured: bool
    disabled: bool
    unavailable: bool
    last_check: str | None
    model: str | None = None


class CapabilitiesGet(pydantic.BaseModel):
    openai: Capability
    elevenlabs: Capability
    transcription: Capability
    google: Capability
    execution_mode: str
