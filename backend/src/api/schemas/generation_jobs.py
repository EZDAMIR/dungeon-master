import datetime
import enum
import typing
import uuid

import pydantic

from .coach import Operation
from .movement_spec import StrictObject


class JobStatusEnum(str, enum.Enum):  # noqa: UP042
    queued = 'queued'
    running = 'running'
    completed = 'completed'
    fallback = 'fallback'
    failed = 'failed'
    cancelled = 'cancelled'
    interrupted = 'interrupted'


class JobCreate(Operation):
    execution_mode: typing.Literal['live', 'fixture']


class JobGet(StrictObject):
    model_config = pydantic.ConfigDict(extra='ignore')
    id: uuid.UUID
    status: JobStatusEnum
    stage: str
    completed_specs: int
    total_specs: int
    result_plan_id: uuid.UUID | None
    error_category: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    input_revision: str
