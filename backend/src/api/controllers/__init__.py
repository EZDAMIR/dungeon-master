"""Controllers package.

Import every domain controller module here so routes can access them via
the parent package.

Add controllers as they are created::

    from . import entity   # noqa: F401
    from .entity import (
        EntityCreateAPIResponseBadRequest,
        EntityCreateBadRequestStatus,
    )
"""

from . import (
    profiles,  # noqa: F401
    users,  # noqa: F401
)
