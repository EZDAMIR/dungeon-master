"""API schemas package.

Teams add domain schemas by creating <resource>.py files in this package
and exporting from this __init__.py.

Usage inside API layers:
    from .. import schemas         # via parent package
    schemas.UserCurrent            # common schema
    schemas.EntityCreate           # domain schema (added later)

Schema files may use direct sibling imports (from . import fields, pagination)
because Pydantic resolves types at class definition time.
"""

from . import ai_coach  # noqa: F401
from . import exercises  # noqa: F401
from . import movement_spec  # noqa: F401
from . import profiles  # noqa: F401
from . import progress  # noqa: F401
from . import training_plans  # noqa: F401
from . import users  # noqa: F401
from . import workout_sessions  # noqa: F401
from .common import ErrorResponse
from .common import HealthResponse
from .common import ReadyResponse
from .common import UserCurrent
from .exercises import AnalysisProfile
from .exercises import CameraAngleEnum
from .exercises import ExerciseGet
from .exercises import ImpactEnum
from .fields import Dict
from .fields import Int
from .fields import String
from .mixins import DateRangeValidatorMixin
from .pagination import Pagination
from .profiles import ConstraintCodeEnum
from .profiles import ConstraintSourceEnum
from .profiles import ConstraintStatusEnum
from .profiles import EquipmentEnum
from .profiles import ExperienceEnum
from .profiles import GoalEnum
from .profiles import ProfileBase
from .profiles import ProfileGet
from .profiles import ProfileUpdate
from .progress import ProgressErrorCounts
from .progress import ProgressSummary
from .progress import RecentSession
from .training_plans import PlanGenerate
from .training_plans import PlanItemGet
from .training_plans import PlanSourceEnum
from .training_plans import PlanStatusEnum
from .training_plans import TrainingPlanGet
from .users import GuestCreate
from .users import GuestToken
from .users import UserGet
from .workout_sessions import SessionStatusEnum
from .workout_sessions import SessionSummary
from .workout_sessions import TechniqueErrorCounts
from .workout_sessions import WorkoutAggregateMetrics
from .workout_sessions import WorkoutComplete
from .workout_sessions import WorkoutSessionCreate
from .workout_sessions import WorkoutSessionGet
from .workout_sessions import WorkoutSetBase
from .workout_sessions import WorkoutSetCreate
from .workout_sessions import WorkoutSetGet

__all__ = [
    'AnalysisProfile',
    'CameraAngleEnum',
    'ConstraintCodeEnum',
    'ConstraintSourceEnum',
    'ConstraintStatusEnum',
    'DateRangeValidatorMixin',
    'Dict',
    'EquipmentEnum',
    'ErrorResponse',
    'ExerciseGet',
    'ExperienceEnum',
    'GoalEnum',
    'GuestCreate',
    'GuestToken',
    'HealthResponse',
    'ImpactEnum',
    'Int',
    'Pagination',
    'PlanGenerate',
    'PlanItemGet',
    'PlanSourceEnum',
    'PlanStatusEnum',
    'ProfileBase',
    'ProfileGet',
    'ProfileUpdate',
    'ProgressErrorCounts',
    'ProgressSummary',
    'ReadyResponse',
    'RecentSession',
    'SessionStatusEnum',
    'SessionSummary',
    'String',
    'TechniqueErrorCounts',
    'TrainingPlanGet',
    'UserCurrent',
    'UserGet',
    'WorkoutAggregateMetrics',
    'WorkoutComplete',
    'WorkoutSessionCreate',
    'WorkoutSessionGet',
    'WorkoutSetBase',
    'WorkoutSetCreate',
    'WorkoutSetGet',
]
