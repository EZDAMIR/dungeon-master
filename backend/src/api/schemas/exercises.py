import enum
import typing
import uuid

import pydantic

from .profiles import ConstraintCodeEnum
from .profiles import EquipmentEnum
from .profiles import ExperienceEnum


class ImpactEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    low = 'low'
    medium = 'medium'
    high = 'high'


class CameraAngleEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    side = 'side'
    front = 'front'
    none = 'none'


class AnalysisProfile(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid')
    version: typing.Literal[1]
    engine_key: typing.Literal['bodyweight_squat_side_v1']
    engine_version: typing.Literal['squat-v1']
    target_reps: typing.Literal[5]
    supported_client: typing.Literal['web']


class ExerciseGet(pydantic.BaseModel):
    id: uuid.UUID
    key: typing.Literal['bodyweight_squat']
    name: typing.Annotated[pydantic.StrictStr, pydantic.StringConstraints(max_length=100)]
    difficulty: ExperienceEnum
    equipment_codes: typing.Annotated[
        list[EquipmentEnum], pydantic.Field(min_length=1, max_length=4)
    ]
    impact_level: ImpactEnum
    camera_angle: CameraAngleEnum
    contraindication_tags: typing.Annotated[
        list[ConstraintCodeEnum], pydantic.Field(max_length=3)
    ]
    analysis_profile: AnalysisProfile
