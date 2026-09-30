import datetime
import typing
import uuid
import zoneinfo

import pydantic

from .coach import Operation
from .coach import Short
from .movement_spec import StrictObject


class Availability(StrictObject):
    weekday: typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=6)]
    start_minute: typing.Annotated[int, pydantic.Field(strict=True, ge=0, lt=1440)]
    end_minute: typing.Annotated[int, pydantic.Field(strict=True, gt=0, le=1440)]

    @pydantic.model_validator(mode='after')
    def time_order(self):
        if self.end_minute <= self.start_minute:
            raise ValueError('Availability end must follow start')
        return self


class SchedulePreferencesBase(StrictObject):
    timezone: typing.Annotated[
        str, pydantic.StringConstraints(strict=True, min_length=1, max_length=100)
    ]
    duration_minutes: typing.Annotated[int, pydantic.Field(strict=True, ge=5, le=120)]
    availability: typing.Annotated[list[Availability], pydantic.Field(max_length=14)]

    @pydantic.field_validator('timezone')
    @classmethod
    def valid_zone(cls, value):
        try:
            zoneinfo.ZoneInfo(value)
        except zoneinfo.ZoneInfoNotFoundError as exc:
            raise ValueError('Unknown IANA timezone') from exc
        return value

    @pydantic.model_validator(mode='after')
    def nonoverlapping(self):
        rows = sorted(self.availability, key=lambda row: (row.weekday, row.start_minute))
        for previous, current in zip(rows, rows[1:], strict=False):
            if (
                previous.weekday == current.weekday
                and previous.end_minute > current.start_minute
            ):
                raise ValueError('Overlapping availability windows')
        return self


class SchedulePreferencesUpdate(SchedulePreferencesBase):
    expected_revision: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]


class SchedulePreferencesGet(SchedulePreferencesBase):
    model_config = pydantic.ConfigDict(extra='ignore')
    revision: int


class ScheduleProposal(Operation):
    expected_revision: typing.Annotated[int, pydantic.Field(strict=True, ge=0)]
    action: typing.Literal['create', 'move', 'cancel', 'skip', 'complete']
    appointment_id: uuid.UUID | None
    starts_at: pydantic.AwareDatetime | None
    duration_minutes: typing.Annotated[int, pydantic.Field(strict=True, ge=5, le=120)]
    title: Short
    plan_id: uuid.UUID | None

    @pydantic.model_validator(mode='after')
    def valid_action(self):
        if self.action in {'create', 'move'} and self.starts_at is None:
            raise ValueError('Appointment start required')
        if self.action != 'create' and self.appointment_id is None:
            raise ValueError('Owned appointment ID required')
        if self.action == 'create' and self.appointment_id is not None:
            raise ValueError('Create must not select appointment')
        return self


class Slot(StrictObject):
    starts_at: datetime.datetime
    ends_at: datetime.datetime


class AppointmentGet(Slot):
    model_config = pydantic.ConfigDict(extra='ignore')
    id: uuid.UUID
    title: str
    status: typing.Literal['planned', 'completed', 'skipped', 'cancelled']
    plan_id: uuid.UUID | None
    sync_status: typing.Literal['local', 'pending', 'synced', 'error']


class ScheduleGet(pydantic.BaseModel):
    timezone: str
    revision: int
    appointments: list[AppointmentGet]
    slots: list[Slot]
