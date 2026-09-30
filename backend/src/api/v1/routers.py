import fastapi

from .endpoints import auth
from .endpoints import exercises
from .endpoints import health
from .endpoints import profile
from .endpoints import progress
from .endpoints import training_plans
from .endpoints import workout_sessions


def get_router() -> fastapi.APIRouter:
    """Return the v1 API router with all registered endpoint routers."""
    router = fastapi.APIRouter()

    router.include_router(health.router, tags=['Health'])

    router.include_router(auth.router, tags=['Auth'])
    router.include_router(profile.router, tags=['Profile'])
    router.include_router(exercises.router, tags=['Exercises'])
    router.include_router(training_plans.router, tags=['Plans'])
    router.include_router(workout_sessions.router, tags=['Sessions'])
    router.include_router(progress.router, tags=['Progress'])

    # Register domain routers here as they are created:
    # router.include_router(entities.router, tags=['Entities'])

    return router
