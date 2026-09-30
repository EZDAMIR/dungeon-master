import uuid
from typing import Annotated

import fastapi

from ... import auth
from ... import controllers
from ... import permission
from ... import responses
from ... import schemas

router = fastapi.APIRouter(prefix='/workout-sessions')


@router.post(
    '',
    summary='Create session',
    dependencies=[permission.PermsRequired([permission.Perm.SESSION_WRITE])],
    response_model=schemas.workout_sessions.WorkoutSessionGet,
    response_description='Idempotently persisted aggregate data',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseForbidden,
            responses.APIResponseNotFound,
            controllers.workout_sessions.SessionConflictResponse,
        ],
    ),
)
async def create_session(
    body: schemas.workout_sessions.WorkoutSessionCreate,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    """Persist an owned session; a foreign plan returns 404 and conflicting retry 409 session_conflict."""
    return await controllers.workout_sessions.create(current_user, body)


@router.post(
    '/{session_id}/sets',
    summary='Add set',
    dependencies=[permission.PermsRequired([permission.Perm.SESSION_WRITE])],
    response_model=schemas.workout_sessions.WorkoutSetGet,
    response_description='Idempotently persisted aggregate data',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseForbidden,
            responses.APIResponseNotFound,
            controllers.workout_sessions.SessionConflictResponse,
        ],
    ),
)
async def add_set(
    body: schemas.workout_sessions.WorkoutSetCreate,
    session_id: uuid.UUID,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    """Persist aggregate set data.

    Returns 404 for a missing owned session/active exercise, or 409
    session_conflict for a conflicting retry or a new immutable-session write.
    """
    return await controllers.workout_sessions.add_set(current_user, session_id, body)


@router.post(
    '/{session_id}/complete',
    summary='Complete session',
    dependencies=[permission.PermsRequired([permission.Perm.SESSION_WRITE])],
    response_model=schemas.workout_sessions.WorkoutSessionGet,
    response_description='Idempotently persisted aggregate data',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseForbidden,
            responses.APIResponseNotFound,
            controllers.workout_sessions.SessionConflictResponse,
        ],
    ),
)
async def complete_session(
    body: schemas.workout_sessions.WorkoutComplete,
    session_id: uuid.UUID,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    """Complete an owned session atomically.

    Returns 404 for a missing owned session, or 409 session_conflict when the
    submitted aggregates, timestamps or retry differ from persisted facts.
    """
    return await controllers.workout_sessions.complete(current_user, session_id, body)
