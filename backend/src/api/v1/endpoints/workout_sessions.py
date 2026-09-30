import uuid
from typing import Annotated

import fastapi

from ... import auth, controllers, permission, responses, schemas

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
            responses.APIResponseConflict,
        ]
    ),
)
async def create_session(
    body: schemas.workout_sessions.WorkoutSessionCreate,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
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
            responses.APIResponseConflict,
        ]
    ),
)
async def add_set(
    body: schemas.workout_sessions.WorkoutSetCreate,
    session_id: uuid.UUID,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
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
            responses.APIResponseConflict,
        ]
    ),
)
async def complete_session(
    body: schemas.workout_sessions.WorkoutComplete,
    session_id: uuid.UUID,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.workout_sessions.complete(current_user, session_id, body)
