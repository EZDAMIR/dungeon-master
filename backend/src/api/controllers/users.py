from ...core import config
from ...core import security
from .. import exceptions
from .. import models
from .. import permission
from .. import schemas


async def guest_create() -> dict:
    user = await models.users.user_create(
        {'email': None, 'display_name': None, 'is_guest': True},
    )
    claims = {
        'id': str(user['id']),
        'email': None,
        'is_superuser': False,
        'permissions': [perm.value for perm in permission.Perm],
    }
    return {
        'access_token': security.create_access_token(claims),
        'token_type': 'bearer',
        'expires_in': config.get_settings().ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        'user': user,
    }


async def me(current_user: schemas.UserCurrent) -> dict:
    try:
        return await models.users.user_get(current_user.id)
    except models.UserDoesNotExist as exc:
        raise exceptions.HTTPUnauthorizedException(detail='User no longer exists') from exc
