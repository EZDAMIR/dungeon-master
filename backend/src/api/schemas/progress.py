import datetime
import typing
import uuid

import pydantic


class ProgressErrorCounts(pydantic.BaseModel):
    depth_insufficient: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    too_fast: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    incomplete_extension: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]


class RecentSession(pydantic.BaseModel):
    id: uuid.UUID
    exercise_key: typing.Annotated[str, pydantic.StringConstraints(max_length=80)]
    completed_at: datetime.datetime
    total_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    accepted_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    duration_ms: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    dominant_error: str | None
    generic_error_counts: dict[str, int] = {}


class ProgressSummary(pydantic.BaseModel):
    completed_sessions: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    total_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    accepted_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    rejected_reps: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    acceptance_rate: typing.Annotated[float, pydantic.Field(ge=0, le=1, allow_inf_nan=False)]
    error_counts: ProgressErrorCounts
    recent_sessions: list[RecentSession]
