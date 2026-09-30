from .. import controllers
from .. import exceptions
from .. import models
from .. import responses
from .. import schemas


class ProfileRequiredStatus(responses.Status):
    PROFILE_REQUIRED = 'profile_required'


class ProfileRequiredResponse(responses.APIResponseNotFound):
    """404 Profile required before catalog access or plan generation."""

    status: ProfileRequiredStatus


async def get_profile(current_user: schemas.UserCurrent) -> dict:
    try:
        return await models.profiles.profile_get(current_user.id)
    except models.ProfileDoesNotExist as exc:
        raise exceptions.HTTPNotFoundException(
            detail='Profile required',
            status=ProfileRequiredStatus.PROFILE_REQUIRED,
        ) from exc


async def replace_profile(
    current_user: schemas.UserCurrent,
    profile: schemas.profiles.ProfileUpdate,
) -> dict:
    await controllers.users.me(current_user)
    data = profile.model_dump(mode='json', by_alias=True)
    constraints = data.pop('confirmed_constraints')
    return await models.profiles.profile_replace(current_user.id, data, constraints)
