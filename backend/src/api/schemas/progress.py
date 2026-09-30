import datetime
import typing
import uuid

import pydantic


class ProgressErrorCounts(pydantic.BaseModel):
    depth_insufficient: typing.Annotated[int, pydantic.Field(ge=0)]
    too_fast: typing.Annotated[int, pydantic.Field(ge=0)]
    incomplete_extension: typing.Annotated[int, pydantic.Field(ge=0)]


class RecentSession(pydantic.BaseModel):
    id: uuid.UUID
    exercise_key: typing.Literal['bodyweight_squat']
    completed_at: datetime.datetime
    total_reps: int
    accepted_reps: int
    duration_ms: int
    dominant_error: (
        typing.Literal['depth_insufficient', 'too_fast', 'incomplete_extension'] | None
    )


class ProgressSummary(pydantic.BaseModel):
    completed_sessions: int
    total_reps: int
    accepted_reps: int
    rejected_reps: int
    acceptance_rate: typing.Annotated[float, pydantic.Field(ge=0, le=1, allow_inf_nan=False)]
    error_counts: ProgressErrorCounts
    recent_sessions: list[RecentSession]
