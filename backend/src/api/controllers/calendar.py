"""Owner-bound real Google connection and reconciliation; internal schedule stays usable."""

import contextlib
import datetime
import hashlib
import json
import secrets
import urllib.parse

from cryptography.fernet import Fernet
from cryptography.fernet import InvalidToken

from ...core import config
from .. import exceptions
from .. import models
from .. import schemas
from ..webhooks import google_calendar


def require_config():
    settings = config.get_settings()
    parsed = urllib.parse.urlsplit(settings.GOOGLE_REDIRECT_URI)
    if (
        not settings.google_available
        or parsed.scheme not in {'https', 'http'}
        or (parsed.scheme == 'http' and parsed.hostname not in {'localhost', '127.0.0.1'})
        or parsed.username
        or parsed.fragment
    ):
        raise exceptions.HTTPServiceUnavailableException(
            detail='Google Calendar setup required', status='config'
        )
    try:
        Fernet(settings.OAUTH_TOKEN_ENCRYPTION_KEY.get_secret_value().encode())
    except (ValueError, TypeError) as exc:
        raise exceptions.HTTPServiceUnavailableException(
            detail='Google encryption configuration invalid', status='config'
        ) from exc


def encrypt(tokens: dict) -> str:
    return (
        Fernet(config.get_settings().OAUTH_TOKEN_ENCRYPTION_KEY.get_secret_value().encode())
        .encrypt(json.dumps(tokens).encode())
        .decode()
    )


def decrypt(value: str) -> dict:
    try:
        return json.loads(
            Fernet(
                config.get_settings().OAUTH_TOKEN_ENCRYPTION_KEY.get_secret_value().encode()
            ).decrypt(value.encode())
        )
    except (InvalidToken, ValueError) as exc:
        raise exceptions.HTTPServiceUnavailableException(
            detail='Calendar credential unavailable', status='credential'
        ) from exc


async def authorize(current_user: schemas.UserCurrent, body: schemas.coach.Operation) -> dict:
    require_config()
    state = secrets.token_urlsafe(48)
    expires = datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=10)
    await models.calendar.state_create(
        current_user.id, hashlib.sha256(state.encode()).hexdigest(), expires
    )
    return {'authorization_url': google_calendar.authorize_url(state), 'expires_at': expires}


async def callback(state: str, code: str) -> dict:
    require_config()
    try:
        row = await models.calendar.state_consume(
            hashlib.sha256(state.encode()).hexdigest(), datetime.datetime.now(datetime.UTC)
        )
    except models.CalendarStateInvalid as exc:
        raise exceptions.HTTPBadRequestException(
            detail='OAuth state invalid, expired or consumed', status='oauth_state'
        ) from exc
    try:
        tokens = await google_calendar.token(code=code)
        scope = tokens.get('scope', '')
        if scope and not set(google_calendar.SCOPES) <= set(scope.split()):
            raise google_calendar.CalendarUnavailable('scope')
        previous = await models.calendar.connection_get(row['user_id'])
        if not tokens.get('refresh_token') and previous:
            tokens['refresh_token'] = decrypt(previous['tokens_encrypted']).get(
                'refresh_token'
            )
        expiry = datetime.datetime.now(datetime.UTC) + datetime.timedelta(
            seconds=tokens['expires_in']
        )
        await models.calendar.connection_save(
            row['user_id'],
            {'tokens_encrypted': encrypt(tokens), 'expires_at': expiry, 'status': 'connected'},
        )
        return {'connected': True}
    except google_calendar.CalendarUnavailable as exc:
        raise exceptions.HTTPServiceUnavailableException(
            detail='Calendar authorization unavailable', status=str(exc)
        ) from exc


async def status(current_user: schemas.UserCurrent) -> dict:
    row = await models.calendar.connection_get(current_user.id)
    return {
        'configured': config.get_settings().google_available,
        'connected': bool(row and row['status'] == 'connected'),
        'sync_status': row.get('status', 'disconnected'),
    }


async def disconnect(current_user: schemas.UserCurrent) -> dict:
    row = await models.calendar.connection_get(current_user.id)
    if row and config.get_settings().google_available:
        token = decrypt(row['tokens_encrypted'])
        with contextlib.suppress(google_calendar.CalendarUnavailable):
            await google_calendar.revoke(token.get('refresh_token') or token['access_token'])
    return await models.calendar.disconnect(current_user.id)


async def access(current_user: schemas.UserCurrent) -> str:
    row = await models.calendar.connection_get(current_user.id)
    if not row or row['status'] != 'connected':
        raise exceptions.HTTPConflictException(
            detail='Connect Google Calendar first', status='not_connected'
        )
    tokens = decrypt(row['tokens_encrypted'])
    if row['expires_at'] <= datetime.datetime.now(datetime.UTC) + datetime.timedelta(
        seconds=30
    ):
        if not tokens.get('refresh_token'):
            await models.calendar.connection_status(current_user.id, 'revoked')
            raise exceptions.HTTPConflictException(
                detail='Reconnect Google Calendar', status='revoked'
            )
        try:
            fresh = await google_calendar.token(refresh_token=tokens['refresh_token'])
        except google_calendar.CalendarUnavailable as exc:
            if str(exc) == 'revoked':
                await models.calendar.connection_status(current_user.id, 'revoked')
            raise
        fresh['refresh_token'] = fresh.get('refresh_token') or tokens['refresh_token']
        tokens = fresh
        await models.calendar.connection_save(
            current_user.id,
            {
                'tokens_encrypted': encrypt(tokens),
                'expires_at': datetime.datetime.now(datetime.UTC)
                + datetime.timedelta(seconds=tokens['expires_in']),
                'status': 'connected',
            },
        )
    return tokens['access_token']


async def sync(current_user: schemas.UserCurrent, body: schemas.coach.Operation) -> dict:
    require_config()
    existing = await models.calendar.sync_run_get(current_user.id, body.operation_id)
    if existing:
        return existing
    try:
        access_token = await access(current_user)
    except google_calendar.CalendarUnavailable as exc:
        raise exceptions.HTTPServiceUnavailableException(
            detail='Calendar access unavailable', status=str(exc)
        ) from exc
    rows = await models.calendar.sync_candidates(current_user.id)
    synced = failed = 0
    for row in rows:
        try:
            existing_link = await models.calendar.link_get(current_user.id, row['id'])
            if row['status'] == 'planned':
                busy = await google_calendar.freebusy(
                    access_token, row['starts_at'], row['ends_at']
                )
                # Existing own event is included in freebusy. Avoid false conflicts
                # by checking the saved app event's interval; foreign times still block.
                own = None
                if existing_link:
                    own = await google_calendar.event_get(
                        access_token, existing_link['event_id']
                    )
                for interval in busy:
                    if (
                        not own
                        or interval['starts_at'].isoformat()
                        != datetime.datetime.fromisoformat(
                            own['start']['dateTime'].replace('Z', '+00:00')
                        ).isoformat()
                        or interval['ends_at'].isoformat()
                        != datetime.datetime.fromisoformat(
                            own['end']['dateTime'].replace('Z', '+00:00')
                        ).isoformat()
                    ):
                        raise google_calendar.CalendarUnavailable('busy')
            result = await google_calendar.event_sync(access_token, row, existing_link or None)
            saved = await models.calendar.sync_save(current_user.id, row, result)
            if saved['stale']:
                failed += 1
            else:
                synced += 1
        except (google_calendar.CalendarUnavailable, KeyError, ValueError):
            await models.calendar.sync_save(current_user.id, row, None)
            failed += 1
    result = {'synced': synced, 'failed': failed, 'status': 'error' if failed else 'synced'}
    return await models.calendar.sync_run_save(current_user.id, body.operation_id, result)
