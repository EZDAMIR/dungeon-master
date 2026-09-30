"""Common API schemas used across the application."""

import uuid

import pydantic


class HealthResponse(pydantic.BaseModel):
    status: pydantic.StrictStr = 'ok'


class ReadyResponse(pydantic.BaseModel):
    status: pydantic.StrictStr
    database: pydantic.StrictStr


class ErrorResponse(pydantic.BaseModel):
    detail: pydantic.StrictStr
    status: pydantic.StrictStr | None = None

    model_config = pydantic.ConfigDict(extra='allow')


class UserCurrent(pydantic.BaseModel):
    """Represents the authenticated caller decoded from the JWT.

    Fields are populated from JWT claims — there is no database lookup.
    Add claim fields as your user table grows.
    """

    id: uuid.UUID
    email: pydantic.EmailStr | None
    is_superuser: bool = False
    permissions: list[pydantic.StrictStr] = pydantic.Field(default_factory=list)

    # Optional: set when your application uses organisations / tenants
    organization_id: pydantic.StrictInt | None = None

    model_config = pydantic.ConfigDict(extra='ignore')
