from typing import Annotated

import fastapi

from ... import auth, controllers, permission, responses, schemas

router = fastapi.APIRouter(prefix='/progress')


@router.get(
    '/summary',
    summary='Get aggregate progress and recent history',
    dependencies=[permission.PermsRequired([permission.Perm.PROGRESS_READ])],
    response_model=schemas.progress.ProgressSummary,
    response_description='Current user completed-session aggregates',
    responses=responses.gen_responses(
        [responses.APIResponseUnauthorized, responses.APIResponseForbidden]
    ),
)
async def progress_summary(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
    recent_limit: Annotated[int, fastapi.Query(ge=1, le=20)] = 5,
) -> dict:
    return await controllers.progress.summary(current_user, recent_limit)
