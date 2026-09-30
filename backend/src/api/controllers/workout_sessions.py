import uuid

from .. import exceptions
from .. import models
from .. import responses
from .. import schemas


class SessionConflictStatus(responses.Status):
    SESSION_CONFLICT = 'session_conflict'


class SessionConflictResponse(responses.APIResponseConflict):
    """409 Conflicting retry, immutable session or inconsistent aggregates."""

    status: SessionConflictStatus


async def create(
    current_user: schemas.UserCurrent,
    body: schemas.workout_sessions.WorkoutSessionCreate,
) -> dict:
    try:
        return await models.workout_sessions.session_create(
            current_user.id,
            body.model_dump(mode='json', by_alias=True),
        )
    except models.UserDoesNotExist as exc:
        raise exceptions.HTTPUnauthorizedException(detail='User no longer exists') from exc
    except models.SessionPlanDoesNotExist as exc:
        raise exceptions.HTTPNotFoundException(detail='Plan not found') from exc
    except models.SessionConflict as exc:
        raise exceptions.HTTPConflictException(
            detail='Session request conflicts with persisted data',
            status=SessionConflictStatus.SESSION_CONFLICT,
        ) from exc


async def add_set(
    current_user: schemas.UserCurrent,
    session_id: uuid.UUID,
    body: schemas.workout_sessions.WorkoutSetCreate,
) -> dict:
    try:
        data = body.model_dump(
            mode='json',
            by_alias=True,
            exclude={'exercise_key', 'engine_version'},
        )
        return await models.workout_sessions.set_create(
            current_user.id,
            session_id,
            data,
            exercise_key=body.exercise_key,
            engine_version=body.engine_version,
        )
    except models.SessionDoesNotExist as exc:
        raise exceptions.HTTPNotFoundException(detail='Session not found') from exc
    except models.SetExerciseDoesNotExist as exc:
        raise exceptions.HTTPNotFoundException(detail='Active exercise not found') from exc
    except models.SessionConflict as exc:
        raise exceptions.HTTPConflictException(
            detail='Set conflicts or session is immutable',
            status=SessionConflictStatus.SESSION_CONFLICT,
        ) from exc


async def complete(
    current_user: schemas.UserCurrent,
    session_id: uuid.UUID,
    body: schemas.workout_sessions.WorkoutComplete,
) -> dict:
    try:
        return await models.workout_sessions.session_complete(
            current_user.id,
            session_id,
            body.model_dump(mode='json', by_alias=True),
        )
    except models.SessionDoesNotExist as exc:
        raise exceptions.HTTPNotFoundException(detail='Session not found') from exc
    except models.SessionConflict as exc:
        raise exceptions.HTTPConflictException(
            detail='Completion conflicts with persisted aggregates',
            status=SessionConflictStatus.SESSION_CONFLICT,
        ) from exc
