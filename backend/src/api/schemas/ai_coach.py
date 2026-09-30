"""Sprint 4A context, source review and structured personalization schemas."""

import datetime
import enum
import typing
import uuid

import pydantic

from . import fields
from . import profiles
from .movement_spec import Identifier
from .movement_spec import MovementSpecV1
from .movement_spec import StrictObject

Text = typing.Annotated[
    str, pydantic.StringConstraints(strict=True, min_length=1, max_length=500)
]
ShortText = typing.Annotated[
    str, pydantic.StringConstraints(strict=True, min_length=1, max_length=120)
]
Title = typing.Annotated[
    str, pydantic.StringConstraints(strict=True, min_length=1, max_length=48)
]
PersonaKey = typing.Literal['maya', 'arman', 'dana']
Language = typing.Literal['ru', 'kk', 'en']
RoutineType = typing.Literal['morning_reset', 'desk_reset', 'pre_sleep']


class CoachStyleEnum(str, enum.Enum):  # noqa: UP042 — Sprint 4A schema enum contract
    calm = 'calm'
    energetic = 'energetic'
    strict = 'strict'
    supportive = 'supportive'


class DocumentStatusEnum(str, enum.Enum):  # noqa: UP042 — Sprint 4A schema enum contract
    uploaded = 'uploaded'
    processed = 'processed'
    failed = 'failed'


class FactStatusEnum(str, enum.Enum):  # noqa: UP042 — Sprint 4A schema enum contract
    pending = 'pending'
    confirmed = 'confirmed'
    rejected = 'rejected'


class SpecStatusEnum(str, enum.Enum):  # noqa: UP042 — Sprint 4A schema enum contract
    generated = 'generated'
    valid = 'valid'
    invalid = 'invalid'
    manual_only = 'manual_only'


class RunStatusEnum(str, enum.Enum):  # noqa: UP042 — Sprint 4A schema enum contract
    completed = 'completed'
    fallback = 'fallback'
    failed = 'failed'


class AIContextBase(StrictObject):
    self_description: typing.Annotated[
        str, pydantic.StringConstraints(strict=True, max_length=5000)
    ]
    preferred_coach_style: CoachStyleEnum
    preferred_language: Language
    additional_preferences: fields.Dict


class AIContextUpdate(AIContextBase):
    pass


class AIContextGet(AIContextBase):
    model_config = pydantic.ConfigDict(extra='ignore')
    id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime


class FactDecision(StrictObject):
    status: typing.Literal['confirmed', 'rejected']


class FactGet(pydantic.BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    normalized_fact: ShortText
    source_excerpt: typing.Annotated[
        str, pydantic.StringConstraints(strict=True, max_length=240)
    ]
    constraint_code: profiles.ConstraintCodeEnum | None
    status: FactStatusEnum


class DocumentGet(pydantic.BaseModel):
    id: uuid.UUID
    filename: typing.Annotated[
        str, pydantic.StringConstraints(strict=True, min_length=1, max_length=255)
    ]
    media_type: typing.Literal['application/pdf', 'text/plain', 'text/markdown']
    size_bytes: typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=5242880)]
    extracted_character_count: typing.Annotated[
        int, pydantic.Field(strict=True, ge=0, le=50000)
    ]
    status: DocumentStatusEnum
    message: ShortText | None
    facts: typing.Annotated[list[FactGet], pydantic.Field(max_length=12)]
    created_at: datetime.datetime


class Schedule(StrictObject):
    days_per_week: typing.Annotated[int, pydantic.Field(strict=True, ge=1, le=4)]
    minutes_per_session: typing.Annotated[int, pydantic.Field(strict=True, ge=5, le=120)]


class CoachPersona(StrictObject):
    tone: CoachStyleEnum
    verbosity: typing.Literal['short']
    language: Language
    motivation_style: typing.Literal['positive', 'direct']


class PlanStrategy(StrictObject):
    intensity: typing.Literal['low', 'moderate', 'high']
    complexity: typing.Literal['simple', 'structured']
    preferred_tempo: ShortText
    rest_style: typing.Literal['generous', 'standard', 'short']


class SourceReference(StrictObject):
    type: typing.Literal['profile', 'preferences', 'document', 'progress']
    label: ShortText
    source_id: uuid.UUID | None = None


class SourceHighlight(StrictObject):
    label: ShortText
    source_type: typing.Literal['profile', 'preferences', 'document', 'progress']
    source_id: uuid.UUID | None = None


class AIUserProfileV1(StrictObject):
    summary: Text
    fitness_level: profiles.ExperienceEnum
    primary_goals: typing.Annotated[
        list[ShortText], pydantic.Field(min_length=1, max_length=4)
    ]
    secondary_goals: typing.Annotated[list[ShortText], pydantic.Field(max_length=4)]
    preferences: typing.Annotated[list[ShortText], pydantic.Field(max_length=10)]
    constraints: typing.Annotated[
        list[profiles.ConstraintCodeEnum], pydantic.Field(max_length=3)
    ]
    equipment: typing.Annotated[
        list[profiles.EquipmentEnum], pydantic.Field(min_length=1, max_length=4)
    ]
    schedule: Schedule
    coach_persona: CoachPersona
    plan_strategy: PlanStrategy
    personalization_highlights: typing.Annotated[list[ShortText], pydantic.Field(max_length=8)]
    persona_key: PersonaKey | None
    source_highlights: typing.Annotated[list[SourceHighlight], pydantic.Field(max_length=10)]
    routine_preferences: typing.Annotated[list[RoutineType], pydantic.Field(max_length=3)]


class AIProfileGet(pydantic.BaseModel):
    id: uuid.UUID
    version: typing.Annotated[int, pydantic.Field(strict=True, ge=1)]
    profile: AIUserProfileV1
    source_document_ids: list[uuid.UUID]
    model: pydantic.StrictStr
    status: typing.Literal['completed', 'fallback', 'synthetic'] = 'completed'
    created_at: datetime.datetime


class PlanExercise(StrictObject):
    exercise_key: Identifier
    display_name: Title
    description: Text
    instruction: Text
    difficulty: profiles.ExperienceEnum
    equipment_codes: typing.Annotated[
        list[profiles.EquipmentEnum], pydantic.Field(min_length=1, max_length=4)
    ]
    impact_level: typing.Literal['low', 'medium', 'high']
    contraindication_tags: typing.Annotated[
        list[profiles.ConstraintCodeEnum], pydantic.Field(max_length=3)
    ]
    camera_angle: typing.Literal['side', 'front', 'none']
    sets: typing.Annotated[int, pydantic.Field(strict=True, ge=1, le=4)]
    target_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=3, le=20)]
    rest_seconds: typing.Annotated[int, pydantic.Field(strict=True, ge=15, le=180)]
    tempo_hint: typing.Annotated[str, pydantic.StringConstraints(strict=True, max_length=80)]
    camera_coaching_requested: pydantic.StrictBool
    reason: Text
    source_references: typing.Annotated[list[SourceReference], pydantic.Field(max_length=6)]
    camera_coaching_mode: typing.Literal['predefined', 'ai_generated', 'manual_only']
    detail_available: pydantic.StrictBool
    swap_available: pydantic.StrictBool


class PlanDay(StrictObject):
    day_index: typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=6)]
    title: Title
    estimated_minutes: typing.Annotated[int, pydantic.Field(strict=True, ge=1, le=130)]
    items: typing.Annotated[list[PlanExercise], pydantic.Field(min_length=1, max_length=4)]


class RoutineItem(StrictObject):
    title: Title
    instruction: ShortText
    duration_seconds: typing.Annotated[int, pydantic.Field(strict=True, ge=15, le=300)]
    camera_coaching_available: typing.Literal[False]


class RoutineBlock(StrictObject):
    routine_type: RoutineType
    title: Title
    estimated_minutes: typing.Annotated[int, pydantic.Field(strict=True, ge=1, le=10)]
    items: typing.Annotated[list[RoutineItem], pydantic.Field(min_length=1, max_length=6)]
    camera_coaching_available: typing.Literal[False]


class AIPlanV1(StrictObject):
    title: Title
    summary: Text
    why_this_plan: typing.Annotated[list[Text], pydantic.Field(min_length=1, max_length=8)]
    excluded_exercises: typing.Annotated[list[ShortText], pydantic.Field(max_length=8)]
    coach_persona: CoachPersona
    days: typing.Annotated[list[PlanDay], pydantic.Field(min_length=1, max_length=4)]
    routine_blocks: typing.Annotated[list[RoutineBlock], pydantic.Field(max_length=3)]

    @pydantic.model_validator(mode='after')
    def unique_days(self):
        if len({day.day_index for day in self.days}) != len(self.days):
            raise ValueError('Duplicate plan day')
        return self


class ExerciseSpecGet(pydantic.BaseModel):
    id: uuid.UUID
    exercise_key: Identifier
    display_name: Title
    description: Text
    difficulty: profiles.ExperienceEnum
    equipment_codes: list[profiles.EquipmentEnum]
    camera_angle: typing.Literal['side', 'front', 'none']
    movement_spec: MovementSpecV1 | None
    generated_by_model: pydantic.StrictStr
    status: SpecStatusEnum
    created_at: datetime.datetime
    updated_at: datetime.datetime


class DemoLoadGet(pydantic.BaseModel):
    persona_key: PersonaKey
    context: AIContextGet
    documents: list[DocumentGet]
    message: ShortText
