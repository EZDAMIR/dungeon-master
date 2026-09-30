"""Deterministic local slots and validated proposal preparation; Google is optional."""

import datetime
import hashlib
import json
import zoneinfo

from .. import controllers
from .. import exceptions
from .. import models
from .. import schemas

UTC = datetime.UTC


def payload_hash(payload: dict) -> str:
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str, separators=(',', ':')).encode()
    ).hexdigest()


def local_instant(date: datetime.date, minute: int, timezone: str) -> datetime.datetime | None:
    zone = zoneinfo.ZoneInfo(timezone)
    naive = datetime.datetime.combine(date, datetime.time()) + datetime.timedelta(
        minutes=minute
    )
    candidates = []
    for fold in [0, 1]:
        aware = naive.replace(tzinfo=zone, fold=fold)
        instant = aware.astimezone(UTC)
        if (
            instant.astimezone(zone).replace(tzinfo=None) == naive
            and instant not in candidates
        ):
            candidates.append(instant)
    # Nonexistent and ambiguous wall clock times are rejected, not normalized.
    return candidates[0] if len(candidates) == 1 else None


def available_slots(
    preferences: dict,
    appointments: list[dict],
    starts_on: datetime.date,
    now: datetime.datetime,
) -> list[dict]:
    slots = []
    for offset in range(7):
        date = starts_on + datetime.timedelta(days=offset)
        for window in preferences['availability']:
            if window['weekday'] != date.weekday():
                continue
            for minute in range(
                window['start_minute'],
                window['end_minute'] - preferences['duration_minutes'] + 1,
                30,
            ):
                start = local_instant(date, minute, preferences['timezone'])
                end = local_instant(
                    date, minute + preferences['duration_minutes'], preferences['timezone']
                )
                if start is None or end is None or start <= now or end <= start:
                    continue
                if any(
                    row['status'] == 'planned'
                    and row['starts_at'] < end
                    and row['ends_at'] > start
                    for row in appointments
                ):
                    continue
                slots.append({'starts_at': start, 'ends_at': end})
    return slots[:100]


async def preferences(current_user: schemas.UserCurrent) -> dict:
    return await models.schedule.preferences_get(current_user.id)


async def replace_preferences(
    current_user: schemas.UserCurrent, body: schemas.schedule.SchedulePreferencesUpdate
) -> dict:
    try:
        return await models.schedule.preferences_replace(
            current_user.id,
            body.model_dump(mode='json', exclude={'expected_revision'}),
            body.expected_revision,
        )
    except models.ScheduleConflict as exc:
        raise exceptions.HTTPConflictException(
            detail='Schedule revision changed', status='stale_revision'
        ) from exc


async def get_schedule(
    current_user: schemas.UserCurrent, starts_on: datetime.date | None = None
) -> dict:
    prefs = await preferences(current_user)
    now = datetime.datetime.now(UTC)
    date = starts_on or now.astimezone(zoneinfo.ZoneInfo(prefs['timezone'])).date()
    if abs((date - now.astimezone(zoneinfo.ZoneInfo(prefs['timezone'])).date()).days) > 366:
        raise exceptions.HTTPBadRequestException(
            detail='Schedule query outside supported range'
        )
    start = datetime.datetime.combine(
        date, datetime.time(), zoneinfo.ZoneInfo(prefs['timezone'])
    ).astimezone(UTC)
    end = datetime.datetime.combine(
        date + datetime.timedelta(days=7),
        datetime.time(),
        zoneinfo.ZoneInfo(prefs['timezone']),
    ).astimezone(UTC)
    rows = await models.schedule.appointments_list(current_user.id, start, end)
    return {
        'timezone': prefs['timezone'],
        'revision': prefs['revision'],
        'appointments': rows,
        'slots': available_slots(prefs, rows, date, now),
    }


def validate_window(
    prefs: dict, body: schemas.schedule.ScheduleProposal, now: datetime.datetime
) -> None:
    if body.action not in {'create', 'move'}:
        return
    start = body.starts_at.astimezone(UTC)
    end = start + datetime.timedelta(minutes=body.duration_minutes)
    zone = zoneinfo.ZoneInfo(prefs['timezone'])
    local = start.astimezone(zone)
    minute = local.hour * 60 + local.minute
    if (
        start <= now
        or local.second
        or local.microsecond
        or local_instant(local.date(), minute, prefs['timezone']) != start
    ):
        raise exceptions.HTTPBadRequestException(
            detail='Future unambiguous minute-aligned time required', status='invalid_slot'
        )
    if not any(
        row['weekday'] == local.weekday()
        and row['start_minute'] <= minute
        and minute + body.duration_minutes <= row['end_minute']
        for row in prefs['availability']
    ):
        raise exceptions.HTTPConflictException(
            detail='Time outside availability', status='invalid_slot'
        )
    local_end = end.astimezone(zone)
    if (
        local_end.date() != local.date()
        or local_instant(
            local_end.date(), local_end.hour * 60 + local_end.minute, prefs['timezone']
        )
        != end
    ):
        raise exceptions.HTTPBadRequestException(
            detail='Appointment crosses unsupported local transition', status='invalid_slot'
        )


async def prepare(
    current_user: schemas.UserCurrent, body: schemas.schedule.ScheduleProposal
) -> dict:
    prefs = await preferences(current_user)
    if prefs['revision'] != body.expected_revision:
        raise exceptions.HTTPConflictException(
            detail='Schedule revision changed', status='stale_revision'
        )
    now = datetime.datetime.now(UTC)
    validate_window(prefs, body, now)
    try:
        if body.appointment_id:
            appointment = await models.schedule.appointment_get(
                current_user.id, body.appointment_id
            )
            if appointment['status'] != 'planned':
                raise models.ProposalConflict
            if body.action == 'complete' and appointment['starts_at'] > now:
                raise models.ProposalConflict
        if body.plan_id:
            await controllers.training_plans.current(current_user)
            await models.training_plans.plan_get(current_user.id, body.plan_id)
        if body.starts_at:
            rows = await models.schedule.appointments_list(
                current_user.id,
                body.starts_at,
                body.starts_at + datetime.timedelta(minutes=body.duration_minutes),
            )
            if any(
                row['status'] == 'planned' and row['id'] != body.appointment_id for row in rows
            ):
                raise models.ProposalConflict
        payload = body.model_dump(mode='json', exclude={'operation_id', 'expected_revision'})
        return await models.coach.proposal_create(
            current_user.id,
            {
                'operation_id': body.operation_id,
                'kind': 'schedule',
                'payload': payload,
                'payload_hash': payload_hash(payload),
                'source_revision': str(prefs['revision']),
                'expires_at': now + datetime.timedelta(minutes=10),
            },
        )
    except models.CoachNotFound as exc:
        raise exceptions.HTTPNotFoundException(detail='Appointment not found') from exc
    except models.PlanDoesNotExist as exc:
        raise exceptions.HTTPNotFoundException(detail='Plan not found') from exc
    except models.ProposalConflict as exc:
        raise exceptions.HTTPConflictException(
            detail='Proposal conflicts with schedule', status='conflict'
        ) from exc


async def export_ics(current_user: schemas.UserCurrent) -> str:
    prefs = await preferences(current_user)
    now = datetime.datetime.now(UTC)
    rows = await models.schedule.appointments_list(
        current_user.id, now - datetime.timedelta(days=31), now + datetime.timedelta(days=366)
    )

    def escape(text):
        return (
            text.replace('\\', '\\\\')
            .replace('\n', '\\n')
            .replace('\r', '')
            .replace(',', '\\,')
            .replace(';', '\\;')
        )

    def stamp(value):
        return value.astimezone(UTC).strftime('%Y%m%dT%H%M%SZ')

    lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Dungeon Master//Schedule//EN',
        'CALSCALE:GREGORIAN',
        'X-WR-TIMEZONE:' + prefs['timezone'],
    ]
    for row in rows:
        lines += [
            'BEGIN:VEVENT',
            'UID:' + str(row['id']) + '@dungeon-master',
            'DTSTAMP:' + stamp(row['created_at']),
            'DTSTART:' + stamp(row['starts_at']),
            'DTEND:' + stamp(row['ends_at']),
            'SUMMARY:' + escape(row['title']),
            'STATUS:' + ('CANCELLED' if row['status'] == 'cancelled' else 'CONFIRMED'),
            'END:VEVENT',
        ]
    lines += ['END:VCALENDAR']
    # RFC 5545 lines folded by UTF-8 octets without splitting codepoints.
    folded = []
    for line in lines:
        part = ''
        for char in line:
            if len((part + char).encode()) > 73:
                folded.append(part)
                part = ' ' + char
            else:
                part += char
        folded.append(part)
    return '\r\n'.join(folded) + '\r\n'
