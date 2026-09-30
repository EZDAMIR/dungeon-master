import datetime
import enum
import typing
import zoneinfo

import pydantic


class GoalEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    general_fitness = 'general_fitness'
    strength_foundation = 'strength_foundation'
    mobility = 'mobility'


class ExperienceEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    beginner = 'beginner'
    intermediate = 'intermediate'
    advanced = 'advanced'


class EquipmentEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    none = 'none'
    chair = 'chair'
    resistance_band = 'resistance_band'
    dumbbells = 'dumbbells'


class ConstraintCodeEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    no_high_impact = 'no_high_impact'
    avoid_deep_knee_flexion = 'avoid_deep_knee_flexion'
    avoid_overhead = 'avoid_overhead'


class ConstraintSourceEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    self_reported = 'self_reported'
    document_extracted = 'document_extracted'


class ConstraintStatusEnum(str, enum.Enum):  # noqa: UP042 — architecture enum contract
    pending_confirmation = 'pending_confirmation'
    confirmed = 'confirmed'
    rejected = 'rejected'


class ProfileBase(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid')
    goal: GoalEnum
    experience_level: ExperienceEnum
    days_per_week: typing.Annotated[int, pydantic.Field(strict=True, ge=1, le=7)]
    session_minutes: typing.Annotated[int, pydantic.Field(strict=True, ge=5, le=120)]
    equipment: typing.Annotated[
        list[EquipmentEnum], pydantic.Field(min_length=1, max_length=4)
    ]
    locale: typing.Annotated[
        str,
        pydantic.StringConstraints(
            strict=True,
            max_length=35,
            pattern=r'^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$',
        ),
    ]
    timezone: typing.Annotated[
        str, pydantic.StringConstraints(strict=True, min_length=1, max_length=100)
    ]
    confirmed_constraints: typing.Annotated[
        list[ConstraintCodeEnum], pydantic.Field(max_length=3)
    ]

    @pydantic.field_validator('equipment', 'confirmed_constraints')
    @classmethod
    def unique_codes(cls, codes):
        if len(set(codes)) != len(codes):
            raise ValueError('Duplicate codes are not allowed')
        if 'none' in codes and len(codes) > 1:
            raise ValueError('none cannot be combined with equipment')
        return codes

    @pydantic.field_validator('timezone')
    @classmethod
    def valid_timezone(cls, value):
        try:
            zoneinfo.ZoneInfo(value)
        except (zoneinfo.ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError('Invalid IANA timezone') from exc
        return value


class ProfileUpdate(ProfileBase):
    """Complete replacement of the mutable profile fields."""


class ProfileGet(ProfileBase):
    model_config = pydantic.ConfigDict(extra='ignore')
    created_at: datetime.datetime
    updated_at: datetime.datetime
