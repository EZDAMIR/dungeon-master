"""Models package.

Import every domain model module here so their SQLAlchemy Tables are
registered with postgres.metadata before Alembic and tests read it.

Add domain models as they are created::

    from . import entity   # noqa: F401
"""

from . import users  # noqa: F401
from .users import UserDoesNotExist  # noqa: F401
