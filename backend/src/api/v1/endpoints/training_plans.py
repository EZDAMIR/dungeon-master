from typing import Annotated

import fastapi

from ... import auth, controllers, permission, responses, schemas

router = fastapi.APIRouter(prefix='/training-plans')


@router.post(
    '/generate',
    summary='Generate deterministic active plan',
    dependencies=[permission.PermsRequired([permission.Perm.PLAN_GENERATE])],
    response_model=schemas.training_plans.TrainingPlanGet,
    response_description='New active plan with nested items',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseForbidden,
            responses.APIResponseNotFound,
            controllers.training_plans.PlanConflictResponse,
        ]
    ),
)
async def generate_plan(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
    body: Annotated[schemas.training_plans.PlanGenerate | None, fastapi.Body()] = None,
) -> dict:
    return await controllers.training_plans.generate(current_user)


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
        ]
    ),
)
async def current_plan(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.training_plans.current(current_user)
