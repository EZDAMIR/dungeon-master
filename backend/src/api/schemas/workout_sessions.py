import datetime
import enum
import typing
import uuid

import pydantic


class SessionStatusEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    started = 'started'
    completed = 'completed'
    abandoned = 'abandoned'


EngineVersion = typing.Annotated[
    str, pydantic.StringConstraints(strict=True, min_length=1, max_length=50)
]
RepCount = typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=500)]
Duration = typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=3_600_000)]


class TechniqueErrorCounts(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid')
    depth_insufficient: RepCount
    too_fast: RepCount
    incomplete_extension: RepCount


class WorkoutAggregateMetrics(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid')
    mean_rep_duration_ms: typing.Annotated[
        float, pydantic.Field(ge=0, le=3_600_000, allow_inf_nan=False)
    ]
    mean_min_knee_angle: typing.Annotated[
        float, pydantic.Field(ge=0, le=180, allow_inf_nan=False)
    ]


class WorkoutSessionCreate(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid')
    client_session_id: uuid.UUID
    plan_id: uuid.UUID | None
    started_at: pydantic.AwareDatetime
    client_engine_version: EngineVersion


class WorkoutSetBase(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid')
    client_set_id: uuid.UUID
    exercise_key: typing.Literal['bodyweight_squat']
    set_index: typing.Annotated[int, pydantic.Field(strict=True, ge=1, le=100)]
    total_reps: RepCount
    accepted_reps: RepCount
    duration_ms: Duration
    error_counts: TechniqueErrorCounts
    metrics: WorkoutAggregateMetrics
    engine_version: EngineVersion

    @pydantic.model_validator(mode='after')
    def accepted_within_total(self):
        if self.accepted_reps > self.total_reps:
            raise ValueError('accepted_reps must not exceed total_reps')
        return self


class WorkoutSetCreate(WorkoutSetBase):
    """Aggregate set command; raw visual data is not accepted."""


class SessionSummary(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid')
    total_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=50_000)]
    accepted_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=50_000)]
    rejected_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=50_000)]
    duration_ms: typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=360_000_000)]
    error_counts: TechniqueErrorCounts

    @pydantic.model_validator(mode='after')
    def consistent_reps(self):
        if (
            self.accepted_reps > self.total_reps
            or self.rejected_reps != self.total_reps - self.accepted_reps
        ):
            raise ValueError('Inconsistent repetition totals')
        return self


class WorkoutComplete(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid')
    completed_at: pydantic.AwareDatetime
    summary: SessionSummary


class WorkoutSessionGet(pydantic.BaseModel):
    id: uuid.UUID
    client_session_id: uuid.UUID
    plan_id: uuid.UUID | None
    status: SessionStatusEnum
    started_at: datetime.datetime
    completed_at: datetime.datetime | None
    client_engine_version: EngineVersion
    summary: SessionSummary | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class WorkoutSetGet(WorkoutSetBase):
    model_config = pydantic.ConfigDict(extra='ignore')
    id: uuid.UUID
    session_id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
