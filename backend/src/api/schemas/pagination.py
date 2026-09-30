"""Pydantic base class for paginated list responses.

Endpoint list schemas inherit from Pagination and add their items field::

    class EntityList(Pagination):
        entities: list[EntityGet]
"""

import pydantic


class Pagination(pydantic.BaseModel):
    total: pydantic.StrictInt = pydantic.Field(
        ge=0, description='Total number of matching records'
    )
    limit: pydantic.StrictInt = pydantic.Field(ge=1, description='Page size')
    offset: pydantic.StrictInt = pydantic.Field(ge=0, description='Number of records skipped')

    model_config = pydantic.ConfigDict(extra='ignore')
