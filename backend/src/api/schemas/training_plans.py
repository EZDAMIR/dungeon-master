import datetime
import enum
import typing
import uuid

import pydantic

from . import fields
from .exercises import ExerciseGet


class PlanStatusEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    draft = 'draft'
    active = 'active'
    completed = 'completed'
    archived = 'archived'


class PlanSourceEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    deterministic = 'deterministic'
    ai_assisted = 'ai_assisted'


class PlanGenerate(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid')
    mode: typing.Literal['deterministic', 'ai_assisted'] = 'deterministic'


class PlanItemGet(pydantic.BaseModel):
    id: uuid.UUID
    exercise_id: uuid.UUID
    exercise: ExerciseGet
    day_index: typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=6)]
    position: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    sets: typing.Annotated[int, pydantic.Field(strict=True, ge=1, le=10)]
    target_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=1, le=100)]
    rest_seconds: typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=600)]
    tempo_hint: (
        typing.Annotated[pydantic.StrictStr, pydantic.StringConstraints(max_length=80)] | None
    )
    scheduled_at: datetime.datetime | None


class TrainingPlanGet(pydantic.BaseModel):
    id: uuid.UUID
    status: PlanStatusEnum
    source: PlanSourceEnum
    starts_on: datetime.date
    rationale: typing.Annotated[pydantic.StrictStr, pydantic.StringConstraints(max_length=500)]
    generator_version: typing.Annotated[
        pydantic.StrictStr, pydantic.StringConstraints(min_length=1, max_length=50)
    ]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    items: list[PlanItemGet]
    ai_metadata: fields.Dict | None = None
