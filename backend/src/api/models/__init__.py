"""Models package.

Import every domain model module here so their SQLAlchemy Tables are
registered with postgres.metadata before Alembic and tests read it.

Add domain models as they are created::

    from . import entity   # noqa: F401
"""

from . import ai_coach  # noqa: F401
from . import calendar  # noqa: F401
from . import coach  # noqa: F401
from . import exercises  # noqa: F401
from . import generation_jobs  # noqa: F401
from . import guest_sessions  # noqa: F401
from . import profiles  # noqa: F401
from . import progress  # noqa: F401
from . import schedule  # noqa: F401
from . import training_plans  # noqa: F401
from . import users  # noqa: F401
from . import workout_sessions  # noqa: F401
from .ai_coach import AIContextChanged  # noqa: F401
from .ai_coach import AIDocumentLimit  # noqa: F401
from .ai_coach import AISourceNotFound  # noqa: F401
from .calendar import CalendarStateInvalid  # noqa: F401
from .coach import BudgetExceeded  # noqa: F401
from .coach import CoachNotFound  # noqa: F401
from .coach import ProposalConflict  # noqa: F401
from .exercises import Exercises  # noqa: F401
from .exercises import exercise_list  # noqa: F401
from .generation_jobs import JobCancelled  # noqa: F401
from .generation_jobs import JobNotFound  # noqa: F401
from .guest_sessions import RefreshInvalid  # noqa: F401
from .profiles import HealthConstraints  # noqa: F401
from .profiles import ProfileDoesNotExist  # noqa: F401
from .profiles import Profiles  # noqa: F401
from .profiles import profile_get  # noqa: F401
from .profiles import profile_replace  # noqa: F401
from .progress import progress_summary  # noqa: F401
from .schedule import ScheduleConflict  # noqa: F401
from .training_plans import PlanDoesNotExist  # noqa: F401
from .training_plans import PlanGenerationConflict  # noqa: F401
from .training_plans import TrainingPlanItems  # noqa: F401
from .training_plans import TrainingPlans  # noqa: F401
from .training_plans import plan_create_active  # noqa: F401
from .training_plans import plan_get  # noqa: F401
from .users import UserDoesNotExist  # noqa: F401
from .users import Users  # noqa: F401
from .users import user_create  # noqa: F401
from .users import user_get  # noqa: F401
from .workout_sessions import SessionConflict  # noqa: F401
from .workout_sessions import SessionDoesNotExist  # noqa: F401
from .workout_sessions import SessionPlanDoesNotExist  # noqa: F401
from .workout_sessions import SetExerciseDoesNotExist  # noqa: F401
from .workout_sessions import WorkoutSessions  # noqa: F401
from .workout_sessions import WorkoutSetResults  # noqa: F401
from .workout_sessions import session_complete  # noqa: F401
from .workout_sessions import session_create  # noqa: F401
from .workout_sessions import session_get  # noqa: F401
from .workout_sessions import set_create  # noqa: F401
