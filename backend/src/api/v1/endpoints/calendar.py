from typing import Annotated

import fastapi

from ... import auth
from ... import controllers
from ... import permission
from ... import responses
from ... import schemas

router = fastapi.APIRouter()
User = Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)]


@router.post(
    '/integrations/google/authorize',
    summary='google authorize',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.calendar.CalendarAuthorizeGet,
    response_description='Owned result',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseNotFound,
            responses.APIResponseConflict,
            responses.APIResponseServiceUnavailable,
            responses.APIResponseBadRequest,
            responses.APIResponseForbidden,
            responses.APIResponseBudgetExceeded,
        ]
    ),
)
async def google_authorize(body: schemas.coach.Operation, current_user: User):
    return await controllers.calendar.authorize(current_user, body)


@router.get(
    '/integrations/google/status',
    summary='google status',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.calendar.CalendarStatusGet,
    response_description='Owned result',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseNotFound,
            responses.APIResponseConflict,
            responses.APIResponseServiceUnavailable,
            responses.APIResponseBadRequest,
            responses.APIResponseForbidden,
            responses.APIResponseBudgetExceeded,
        ]
    ),
)
async def google_status(current_user: User):
    return await controllers.calendar.status(current_user)


@router.delete(
    '/integrations/google/connection',
    summary='google disconnect',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.calendar.CalendarConnectionGet,
    response_description='Owned result',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseNotFound,
            responses.APIResponseConflict,
            responses.APIResponseServiceUnavailable,
            responses.APIResponseBadRequest,
            responses.APIResponseForbidden,
            responses.APIResponseBudgetExceeded,
        ]
    ),
)
async def google_disconnect(current_user: User):
    return await controllers.calendar.disconnect(current_user)


@router.post(
    '/integrations/google/sync',
    summary='google sync',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.calendar.CalendarSyncGet,
    response_description='Owned result',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseNotFound,
            responses.APIResponseConflict,
            responses.APIResponseServiceUnavailable,
            responses.APIResponseBadRequest,
            responses.APIResponseForbidden,
            responses.APIResponseBudgetExceeded,
        ]
    ),
)
async def google_sync(body: schemas.coach.Operation, current_user: User):
    return await controllers.calendar.sync(current_user, body)


@router.get(
    '/integrations/google/callback',
    summary='Google callback with one-time owner-bound state',
    dependencies=[permission.NoPermsRequired()],
    response_model=schemas.calendar.CalendarConnectionGet,
    response_description='Verified state result',
    responses=responses.gen_responses(
        [responses.APIResponseBadRequest, responses.APIResponseServiceUnavailable]
    ),
)
async def google_callback(
    state: str = fastapi.Query(min_length=20, max_length=128),
    code: str = fastapi.Query(min_length=1, max_length=4096),
):
    return await controllers.calendar.callback(state, code)
