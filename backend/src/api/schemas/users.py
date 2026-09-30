import datetime
import typing
import uuid

import pydantic


class GuestCreate(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid')


class UserGet(pydantic.BaseModel):
    id: uuid.UUID
    email: pydantic.EmailStr | None
    display_name: (
        typing.Annotated[pydantic.StrictStr, pydantic.StringConstraints(max_length=100)] | None
    )
    is_guest: bool
    created_at: datetime.datetime


class GuestToken(pydantic.BaseModel):
    access_token: pydantic.StrictStr
    token_type: typing.Literal['bearer']
    expires_in: typing.Annotated[int, pydantic.Field(strict=True, ge=1)]
    user: UserGet
