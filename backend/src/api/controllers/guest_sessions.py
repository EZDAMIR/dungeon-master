"""Recovery cookies never create a new owner when refresh fails."""

import datetime
import hashlib
import hmac
import secrets
import urllib.parse

import fastapi

from ...core import config
from ...core import security
from .. import controllers
from .. import exceptions
from .. import models
from .. import permission
from .. import schemas

COOKIE = 'dm_refresh'


def digest(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def successor(secret: str) -> str:
    return hmac.new(
        config.get_settings().SECRET_KEY.encode(),
        ('guest-refresh-v1:' + secret).encode(),
        hashlib.sha256,
    ).hexdigest()


def check_origin(request: fastapi.Request) -> None:
    settings = config.get_settings()
    origin = request.headers.get('origin')
    allowed = set(settings.cors_origins_list())
    if settings.APP_PUBLIC_URL:
        parsed = urllib.parse.urlsplit(settings.APP_PUBLIC_URL)
        allowed.add(f'{parsed.scheme}://{parsed.netloc}')
    if not settings.is_production:
        allowed.update(
            {
                'http://test',
                'http://localhost:5173',
                'http://localhost:8001',
                'http://127.0.0.1:5173',
            }
        )
    if origin not in allowed:
        raise exceptions.HTTPForbiddenException(
            detail='Trusted Origin required', status='csrf'
        )


def set_cookie(response: fastapi.Response, secret: str, expires_at: datetime.datetime) -> None:
    settings = config.get_settings()
    response.set_cookie(
        COOKIE,
        secret,
        expires=expires_at,
        httponly=True,
        secure=settings.is_production or settings.APP_PUBLIC_URL.startswith('https://'),
        samesite='lax',
        path=settings.API_V1_PREFIX + '/auth',
    )


def token_for(user: dict) -> dict:
    claims = {
        'id': str(user['id']),
        'email': user['email'],
        'is_superuser': False,
        'permissions': [perm.value for perm in permission.Perm],
    }
    return {
        'access_token': security.create_access_token(claims),
        'token_type': 'bearer',
        'expires_in': config.get_settings().ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        'user': user,
    }


async def issue(user: dict, response: fastapi.Response) -> dict:
    secret = secrets.token_urlsafe(48)
    expiry = datetime.datetime.now(datetime.UTC) + datetime.timedelta(
        days=config.get_settings().GUEST_REFRESH_TTL_DAYS
    )
    await models.guest_sessions.create(user['id'], digest(secret), expiry)
    set_cookie(response, secret, expiry)
    return token_for(user)


async def create_guest(response: fastapi.Response) -> dict:
    data = await controllers.users.guest_create()
    return await issue(data['user'], response)


async def bootstrap(current_user: schemas.UserCurrent, response: fastapi.Response) -> dict:
    user = await controllers.users.me(current_user)
    return await issue(user, response)


async def refresh(request: fastapi.Request, response: fastapi.Response) -> dict:
    check_origin(request)
    secret = request.cookies.get(COOKIE, '')
    if not 20 <= len(secret) <= 128:
        raise exceptions.HTTPUnauthorizedException(
            detail='Guest recovery credential unavailable', status='recovery_required'
        )
    next_secret = successor(secret)
    try:
        row = await models.guest_sessions.rotate(
            digest(secret), digest(next_secret), datetime.datetime.now(datetime.UTC)
        )
        user = await models.users.user_get(row['user_id'])
    except (models.RefreshInvalid, models.UserDoesNotExist) as exc:
        raise exceptions.HTTPUnauthorizedException(
            detail='Guest recovery credential expired or revoked', status='recovery_required'
        ) from exc
    set_cookie(response, next_secret, row['expires_at'])
    return token_for(user)


async def logout(request: fastapi.Request, response: fastapi.Response) -> dict:
    check_origin(request)
    result = await models.guest_sessions.revoke(digest(request.cookies.get(COOKIE, '')))
    response.delete_cookie(COOKIE, path=config.get_settings().API_V1_PREFIX + '/auth')
    return result
