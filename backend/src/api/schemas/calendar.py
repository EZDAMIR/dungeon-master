import datetime

import pydantic


class CalendarAuthorizeGet(pydantic.BaseModel):
    authorization_url: str
    expires_at: datetime.datetime


class CalendarConnectionGet(pydantic.BaseModel):
    connected: bool


class CalendarStatusGet(CalendarConnectionGet):
    configured: bool
    sync_status: str


class CalendarSyncGet(pydantic.BaseModel):
    synced: int
    failed: int
    status: str


class LogoutGet(pydantic.BaseModel):
    revoked: bool
