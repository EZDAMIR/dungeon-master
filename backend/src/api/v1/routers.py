import fastapi

from .endpoints import auth, exercises, health, profile, training_plans


def get_router() -> fastapi.APIRouter:
    """Return the v1 API router with all registered endpoint routers."""
    router = fastapi.APIRouter()

    router.include_router(health.router, tags=['Health'])

    router.include_router(auth.router, tags=['Auth'])
    router.include_router(profile.router, tags=['Profile'])
    router.include_router(exercises.router, tags=['Exercises'])
    router.include_router(training_plans.router, tags=['Plans'])

    # Register domain routers here as they are created:
    # router.include_router(entities.router, tags=['Entities'])

    return router
