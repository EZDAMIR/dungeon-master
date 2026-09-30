from typing import Annotated

import fastapi

from ... import auth, controllers, permission, responses, schemas

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
    body: Annotated[schemas.users.GuestCreate | None, fastapi.Body()] = None,
) -> dict:
    return await controllers.users.guest_create()


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
    return await controllers.users.me(current_user)
