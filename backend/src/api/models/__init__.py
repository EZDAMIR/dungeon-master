"""Models package.

Import every domain model module here so their SQLAlchemy Tables are
registered with postgres.metadata before Alembic and tests read it.

Add domain models as they are created::

    from . import entity   # noqa: F401
"""

from . import (
    exercises,  # noqa: F401
    profiles,  # noqa: F401
    training_plans,  # noqa: F401
    users,  # noqa: F401
    workout_sessions,  # noqa: F401
)
from .profiles import ProfileDoesNotExist  # noqa: F401
from .training_plans import PlanDoesNotExist, PlanGenerationConflict  # noqa: F401
from .users import UserDoesNotExist  # noqa: F401
from .workout_sessions import (  # noqa: F401
    SessionConflict,
    SessionDoesNotExist,
    SessionPlanDoesNotExist,
    SetExerciseDoesNotExist,
)  # noqa: F401
