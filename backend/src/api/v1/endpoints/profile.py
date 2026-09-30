from typing import Annotated

import fastapi

from ... import auth, controllers, permission, responses, schemas

router = fastapi.APIRouter(prefix='/profile')


@router.get(
    '',
    summary='Get fitness profile',
    dependencies=[permission.PermsRequired([permission.Perm.PROFILE_READ])],
    response_model=schemas.profiles.ProfileGet,
    response_description='Fitness profile with confirmed constraints',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseForbidden,
            responses.APIResponseNotFound,
        ]
    ),
)
async def get_profile(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.profiles.get_profile(current_user)


@router.put(
    '',
    summary='Fully replace fitness profile',
    dependencies=[permission.PermsRequired([permission.Perm.PROFILE_UPDATE])],
    response_model=schemas.profiles.ProfileGet,
    response_description='Replaced fitness profile',
    responses=responses.gen_responses(
        [responses.APIResponseUnauthorized, responses.APIResponseForbidden]
    ),
)
async def replace_profile(
    body: schemas.profiles.ProfileUpdate,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.profiles.replace_profile(current_user, body)
