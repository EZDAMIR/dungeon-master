from typing import Annotated

import fastapi

from ... import auth
from ... import controllers
from ... import permission
from ... import responses
from ... import schemas

router = fastapi.APIRouter(prefix='/auth')


@router.post(
    '/guest',
    summary='Create anonymous guest identity',
    dependencies=[permission.NoPermsRequired()],
    response_model=schemas.users.GuestToken,
    response_description='Guest identity and bearer token',
    responses=responses.gen_responses([]),
)
async def create_guest(
    response: fastapi.Response,
    body: Annotated[schemas.users.GuestCreate | None, fastapi.Body()] = None,
) -> dict:
    """Create a guest from an omitted or empty body; unknown fields return 422."""
    return await controllers.guest_sessions.create_guest(response)


@router.get(
    '/me',
    summary='Get persisted current user',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.users.UserGet,
    response_description='Persisted current user',
    responses=responses.gen_responses([responses.APIResponseUnauthorized]),
)
async def get_me(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    """Return the persisted caller; invalid JWTs or a missing user return 401."""
    return await controllers.users.me(current_user)


@router.post(
    '/session',
    summary='Add recovery cookie to a legacy guest',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.users.GuestToken,
    response_description='Same owner and HttpOnly recovery cookie',
    responses=responses.gen_responses([responses.APIResponseUnauthorized]),
)
async def bootstrap_session(
    response: fastapi.Response,
    body: schemas.users.GuestCreate,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
):
    return await controllers.guest_sessions.bootstrap(current_user, response)


@router.post(
    '/refresh',
    summary='Rotate guest recovery credential',
    dependencies=[permission.NoPermsRequired()],
    response_model=schemas.users.GuestToken,
    response_description='Same owner and rotated HttpOnly recovery cookie',
    responses=responses.gen_responses(
        [responses.APIResponseUnauthorized, responses.APIResponseForbidden]
    ),
)
async def refresh_guest(
    body: schemas.users.GuestCreate, request: fastapi.Request, response: fastapi.Response
):
    return await controllers.guest_sessions.refresh(request, response)


@router.post(
    '/logout',
    summary='Revoke guest recovery credential',
    dependencies=[permission.NoPermsRequired()],
    response_model=schemas.calendar.LogoutGet,
    response_description='Recovery revoked',
    responses=responses.gen_responses([responses.APIResponseForbidden]),
)
async def logout_guest(
    body: schemas.users.GuestCreate, request: fastapi.Request, response: fastapi.Response
):
    return await controllers.guest_sessions.logout(request, response)
