import fastapi

from .endpoints import ai_coach
from .endpoints import auth
from .endpoints import calendar
from .endpoints import coach
from .endpoints import exercises
from .endpoints import generation_jobs
from .endpoints import health
from .endpoints import profile
from .endpoints import progress
from .endpoints import schedule
from .endpoints import speech
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
    router.include_router(ai_coach.router, tags=['Sprint 4A Coach'])

    router.include_router(coach.router, tags=['Coach'])
    router.include_router(speech.router, tags=['Speech'])
    router.include_router(schedule.router, tags=['Schedule'])
    router.include_router(calendar.router, tags=['Calendar'])
    router.include_router(generation_jobs.router, tags=['Generation'])

    # Register domain routers here as they are created:
    # router.include_router(entities.router, tags=['Entities'])

    return router
