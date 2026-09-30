"""Typed Sprint 4B conversations, actions and provider provenance."""

import datetime
import typing
import uuid

import pydantic

from .ai_coach import CoachStyleEnum
from .ai_coach import Language
from .ai_coach import SourceReference
from .movement_spec import StrictObject

Short = typing.Annotated[
    str, pydantic.StringConstraints(strict=True, min_length=1, max_length=120)
]
VoiceID = typing.Annotated[
    str, pydantic.StringConstraints(strict=True, pattern=r'^[a-zA-Z0-9_-]{1,100}$')
]


class CoachPreferencesUpdate(StrictObject):
    voice_id: VoiceID | None
    language: Language
    style: CoachStyleEnum
    audio_enabled: pydantic.StrictBool


class CoachPreferencesGet(CoachPreferencesUpdate):
    model_config = pydantic.ConfigDict(extra='ignore')
    revision: int


class Operation(StrictObject):
    operation_id: uuid.UUID


class CoachTurn(Operation):
    conversation_id: uuid.UUID | None
    text: typing.Annotated[
        str, pydantic.StringConstraints(strict=True, min_length=1, max_length=2000)
    ]
    screen: typing.Literal['planning', 'schedule', 'results', 'exercise', 'settings']
    exercise_key: (
        typing.Annotated[str, pydantic.StringConstraints(strict=True, max_length=80)] | None
    )


class Provenance(StrictObject):
    execution_mode: typing.Literal['live', 'fixture', 'fallback']
    model_used: str
    prompt_version: str
    generated_at: datetime.datetime
    input_revision: str
    cached: bool


class ProposalGet(pydantic.BaseModel):
    id: uuid.UUID
    kind: typing.Literal['schedule', 'plan_change', 'exercise_swap']
    payload: dict
    source_revision: str
    payload_hash: str
    expires_at: datetime.datetime
    status: typing.Literal['pending', 'confirmed', 'rejected']
    result: dict | None


UIAction = typing.Literal[
    'open_plan', 'open_schedule', 'open_progress', 'open_exercise', 'open_camera'
]


class CoachAnswer(StrictObject):
    display_text: typing.Annotated[
        str, pydantic.StringConstraints(strict=True, min_length=1, max_length=3000)
    ]
    speech_text: typing.Annotated[
        str, pydantic.StringConstraints(strict=True, min_length=1, max_length=400)
    ]
    source_references: typing.Annotated[list[SourceReference], pydantic.Field(max_length=8)]
    ui_actions: typing.Annotated[list[UIAction], pydantic.Field(max_length=3)]


class CoachMessageGet(CoachAnswer):
    model_config = pydantic.ConfigDict(extra='ignore')
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    proposal_ids: list[uuid.UUID]
    proposals: list[ProposalGet]
    provenance: Provenance
    error_category: str | None


class ReadTool(StrictObject):
    """Owner is injected by controller, never a model argument."""


class ExerciseTool(StrictObject):
    exercise_key: Short


class PlanChangeTool(StrictObject):
    plan_id: uuid.UUID
    target_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=3, le=20)]
    sets: typing.Annotated[int, pydantic.Field(strict=True, ge=1, le=4)]


class ExerciseSwapTool(StrictObject):
    plan_id: uuid.UUID
    item_id: uuid.UUID
    exercise_key: Short
