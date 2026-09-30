import uuid
from typing import Annotated

import fastapi

from ... import auth
from ... import controllers
from ... import permission
from ... import responses
from ... import schemas

router = fastapi.APIRouter()
User = Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)]


@router.get(
    '/coach/preferences',
    summary='coach preferences get',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.coach.CoachPreferencesGet,
    response_description='Owned result',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseNotFound,
            responses.APIResponseConflict,
            responses.APIResponseServiceUnavailable,
            responses.APIResponseBadRequest,
            responses.APIResponseForbidden,
            responses.APIResponseBudgetExceeded,
        ]
    ),
)
async def coach_preferences_get(current_user: User):
    return await controllers.speech.get_preferences(current_user)


@router.put(
    '/coach/preferences',
    summary='coach preferences replace',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.coach.CoachPreferencesGet,
    response_description='Owned result',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseNotFound,
            responses.APIResponseConflict,
            responses.APIResponseServiceUnavailable,
            responses.APIResponseBadRequest,
            responses.APIResponseForbidden,
            responses.APIResponseBudgetExceeded,
        ]
    ),
)
async def coach_preferences_replace(
    body: schemas.coach.CoachPreferencesUpdate, current_user: User
):
    return await controllers.speech.replace_preferences(current_user, body)


@router.post(
    '/coach/turns',
    summary='coach turn create',
    dependencies=[permission.PermsRequired([]), fastapi.Depends(controllers.speech.limit_ip)],
    response_model=schemas.coach.CoachMessageGet,
    response_description='Owned result',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseNotFound,
            responses.APIResponseConflict,
            responses.APIResponseServiceUnavailable,
            responses.APIResponseBadRequest,
            responses.APIResponseForbidden,
            responses.APIResponseBudgetExceeded,
        ]
    ),
)
async def coach_turn_create(body: schemas.coach.CoachTurn, current_user: User):
    return await controllers.coach.turn(current_user, body)


@router.post(
    '/coach/proposals/{proposal_id}/confirm',
    summary='coach proposal confirm',
    dependencies=[permission.PermsRequired([]), fastapi.Depends(controllers.speech.limit_ip)],
    response_model=schemas.coach.ProposalGet,
    response_description='Owned result',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseNotFound,
            responses.APIResponseConflict,
            responses.APIResponseServiceUnavailable,
            responses.APIResponseBadRequest,
            responses.APIResponseForbidden,
            responses.APIResponseBudgetExceeded,
        ]
    ),
)
async def coach_proposal_confirm(
    body: schemas.coach.Operation, proposal_id: uuid.UUID, current_user: User
):
    return await controllers.coach.transition(current_user, proposal_id, body, True)


@router.post(
    '/coach/proposals/{proposal_id}/reject',
    summary='coach proposal reject',
    dependencies=[permission.PermsRequired([]), fastapi.Depends(controllers.speech.limit_ip)],
    response_model=schemas.coach.ProposalGet,
    response_description='Owned result',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseNotFound,
            responses.APIResponseConflict,
            responses.APIResponseServiceUnavailable,
            responses.APIResponseBadRequest,
            responses.APIResponseForbidden,
            responses.APIResponseBudgetExceeded,
        ]
    ),
)
async def coach_proposal_reject(
    body: schemas.coach.Operation, proposal_id: uuid.UUID, current_user: User
):
    return await controllers.coach.transition(current_user, proposal_id, body, False)


@router.post(
    '/coach/transcribe',
    summary='coach transcribe',
    dependencies=[permission.PermsRequired([]), fastapi.Depends(controllers.speech.limit_ip)],
    response_model=schemas.speech.TranscriptionGet,
    response_description='Owned result',
    responses=responses.gen_responses(
        [
            responses.APIResponseUnauthorized,
            responses.APIResponseNotFound,
            responses.APIResponseConflict,
            responses.APIResponseServiceUnavailable,
            responses.APIResponseBadRequest,
            responses.APIResponseForbidden,
            responses.APIResponseBudgetExceeded,
        ]
    ),
)
async def coach_transcribe(
    current_user: User,
    file: Annotated[fastapi.UploadFile, fastapi.File()],
    language: Annotated[schemas.ai_coach.Language, fastapi.Form()],
    duration_seconds: Annotated[float, fastapi.Form()],
):
    return await controllers.speech.transcribe(current_user, file, language, duration_seconds)
