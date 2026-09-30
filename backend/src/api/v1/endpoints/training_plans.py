from typing import Annotated

import fastapi

from ... import auth
from ... import controllers
from ... import permission
from ... import responses
from ... import schemas

router = fastapi.APIRouter(prefix='/training-plans')


@router.post(
    '/generate',
    summary='Generate active deterministic or Sprint 4A personalized plan',
    dependencies=[permission.PermsRequired([permission.Perm.PLAN_GENERATE])],
    response_model=schemas.training_plans.TrainingPlanGet,
    response_description='New active plan with nested items',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseForbidden,
            controllers.profiles.ProfileRequiredResponse,
            controllers.training_plans.PlanConflictResponse,
        ],
    ),
)
async def generate_plan(
    *,
    body: Annotated[schemas.training_plans.PlanGenerate | None, fastapi.Body()] = None,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    """Generate an eligible deterministic plan.

    Returns 404 profile_required for a missing profile, or 409 with
    no_eligible_exercises / plan_generation_conflict for generation failures.
    """
    return await controllers.training_plans.generate_requested(current_user, body)


@router.get(
    '/current',
    summary='Get active training plan',
    dependencies=[permission.PermsRequired([permission.Perm.PLAN_READ])],
    response_model=schemas.training_plans.TrainingPlanGet,
    response_description='Current active plan with nested items',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseForbidden,
            responses.APIResponseNotFound,
        ],
    ),
)
async def current_plan(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    """Read the caller's active plan; no active plan returns 404."""
    return await controllers.training_plans.current(current_user)
