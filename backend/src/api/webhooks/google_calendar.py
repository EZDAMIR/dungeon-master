"""OAuth and Calendar HTTP only. No database sessions or account connectors."""

import datetime
import urllib.parse

import httpx

from ...core import config
from ...core import http_client


class CalendarUnavailable(Exception):
    pass


SCOPES = [
    'https://www.googleapis.com/auth/calendar.freebusy',
    'https://www.googleapis.com/auth/calendar.events',
]


def authorize_url(state: str) -> str:
    settings = config.get_settings()
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(
        {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'redirect_uri': settings.GOOGLE_REDIRECT_URI,
            'response_type': 'code',
            'scope': ' '.join(SCOPES),
            'state': state,
            'access_type': 'offline',
            'prompt': 'consent',
        }
    )


async def request(method: str, url: str, **kwargs) -> httpx.Response:
    try:
        response = await http_client.get_client().request(method, url, timeout=20, **kwargs)
        if response.status_code not in {200, 201, 204}:
            raise CalendarUnavailable(
                {
                    401: 'revoked',
                    403: 'forbidden',
                    404: 'not_found',
                    409: 'exists',
                    412: 'stale',
                    429: 'rate_limit',
                }.get(response.status_code, 'network')
            )
        return response
    except httpx.TimeoutException as exc:
        raise CalendarUnavailable('timeout') from exc
    except httpx.HTTPError as exc:
        raise CalendarUnavailable('network') from exc


async def token(code: str | None = None, refresh_token: str | None = None) -> dict:
    settings = config.get_settings()
    data = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET.get_secret_value(),
    }
    if code:
        data.update(
            code=code,
            redirect_uri=settings.GOOGLE_REDIRECT_URI,
            grant_type='authorization_code',
        )
    else:
        data.update(refresh_token=refresh_token, grant_type='refresh_token')
    try:
        result = (
            await request('POST', 'https://oauth2.googleapis.com/token', data=data)
        ).json()
        if not result.get('access_token') or not isinstance(result.get('expires_in'), int):
            raise CalendarUnavailable('schema')
        return result
    except (ValueError, TypeError) as exc:
        raise CalendarUnavailable('schema') from exc


async def revoke(token_value: str) -> None:
    await request('POST', 'https://oauth2.googleapis.com/revoke', data={'token': token_value})


async def freebusy(
    access_token: str, start: datetime.datetime, end: datetime.datetime
) -> list[dict]:
    try:
        response = await request(
            'POST',
            'https://www.googleapis.com/calendar/v3/freeBusy',
            headers={'Authorization': 'Bearer ' + access_token},
            json={
                'timeMin': start.isoformat(),
                'timeMax': end.isoformat(),
                'items': [{'id': 'primary'}],
            },
        )
        calendar = response.json()['calendars']['primary']
        if calendar.get('errors'):
            raise CalendarUnavailable('forbidden')
        return [
            {
                'starts_at': datetime.datetime.fromisoformat(
                    row['start'].replace('Z', '+00:00')
                ),
                'ends_at': datetime.datetime.fromisoformat(row['end'].replace('Z', '+00:00')),
            }
            for row in calendar['busy']
        ]
    except (KeyError, ValueError, TypeError) as exc:
        raise CalendarUnavailable('schema') from exc


async def event_get(access_token: str, event_id: str) -> dict:
    return (
        await request(
            'GET',
            'https://www.googleapis.com/calendar/v3/calendars/primary/events/' + event_id,
            headers={'Authorization': 'Bearer ' + access_token},
        )
    ).json()


async def event_sync(access_token: str, appointment: dict, existing: dict | None) -> dict:
    event_id = appointment['id'].hex
    url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    body = {
        'id': event_id,
        'summary': appointment['title'],
        'start': {'dateTime': appointment['starts_at'].isoformat()},
        'end': {'dateTime': appointment['ends_at'].isoformat()},
        'extendedProperties': {'private': {'dm_appointment': str(appointment['id'])}},
    }
    headers = {'Authorization': 'Bearer ' + access_token}
    if appointment['status'] in {'cancelled', 'skipped'}:
        if existing:
            current = await event_get(access_token, event_id)
            if current.get('extendedProperties', {}).get('private', {}).get(
                'dm_appointment'
            ) != str(appointment['id']):
                raise CalendarUnavailable('foreign_event')
            headers['If-Match'] = current['etag']
            await request(
                'DELETE', url + '/' + event_id, headers=headers, params={'sendUpdates': 'none'}
            )
        return {'event_id': event_id, 'etag': None, 'deleted': True}
    if existing:
        current = await event_get(access_token, event_id)
        if current.get('extendedProperties', {}).get('private', {}).get(
            'dm_appointment'
        ) != str(appointment['id']):
            raise CalendarUnavailable('foreign_event')
        headers['If-Match'] = current['etag']
        result = (
            await request(
                'PUT',
                url + '/' + event_id,
                headers=headers,
                json=body,
                params={'sendUpdates': 'none'},
            )
        ).json()
    else:
        try:
            result = (
                await request(
                    'POST', url, headers=headers, json=body, params={'sendUpdates': 'none'}
                )
            ).json()
        except CalendarUnavailable as exc:
            if str(exc) not in {'timeout', 'exists'}:
                raise
            result = await event_get(access_token, event_id)
            if result.get('extendedProperties', {}).get('private', {}).get(
                'dm_appointment'
            ) != str(appointment['id']):
                raise CalendarUnavailable('foreign_event') from exc
    return {'event_id': result['id'], 'etag': result.get('etag'), 'deleted': False}
