from typing import Annotated

import fastapi

from ... import auth
from ... import controllers
from ... import permission
from ... import responses
from ... import schemas

router = fastapi.APIRouter(prefix='/progress')


@router.get(
    '/summary',
    summary='Get aggregate progress and recent history',
    dependencies=[permission.PermsRequired([permission.Perm.PROGRESS_READ])],
    response_model=schemas.progress.ProgressSummary,
    response_description='Current user completed-session aggregates',
    responses=responses.gen_responses(
        [responses.APIResponseUnauthorized, responses.APIResponseForbidden],
    ),
)
async def progress_summary(
    *,
    recent_limit: Annotated[int, fastapi.Query(ge=1, le=20)] = 5,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    """Return owned completed-session totals; a limit outside 1–20 returns 422."""
    return await controllers.progress.summary(current_user, recent_limit)
