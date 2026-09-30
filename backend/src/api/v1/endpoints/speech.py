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
    '/voices',
    summary='voice list',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.speech.VoicesGet,
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
async def voice_list(
    current_user: User,
    language: schemas.ai_coach.Language = 'ru',
    page_size: int = fastapi.Query(6, ge=1, le=100),
    next_page_token: str | None = fastapi.Query(None, max_length=256),
):
    return await controllers.speech.list_voices(
        current_user, language, page_size, next_page_token
    )


@router.get(
    '/voices/models',
    summary='voice models list',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.speech.VoiceModelsGet,
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
async def voice_models_list(current_user: User):
    return await controllers.speech.list_models()


@router.post(
    '/voices/{voice_id}/preview',
    summary='voice preview',
    dependencies=[permission.PermsRequired([]), fastapi.Depends(controllers.speech.limit_ip)],
    response_model=None,
    response_description='Owned result',
    responses={
        200: {
            'description': 'Authenticated MP3',
            'content': {'audio/mpeg': {'schema': {'type': 'string', 'format': 'binary'}}},
        },
        **responses.gen_responses(
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
    },
)
async def voice_preview(
    body: schemas.speech.PreviewCreate, voice_id: schemas.coach.VoiceID, current_user: User
):
    return await controllers.speech.preview(current_user, voice_id, body)


@router.post(
    '/speech',
    summary='speech create',
    dependencies=[permission.PermsRequired([]), fastapi.Depends(controllers.speech.limit_ip)],
    response_model=None,
    response_description='Owned result',
    responses={
        200: {
            'description': 'Authenticated MP3',
            'content': {'audio/mpeg': {'schema': {'type': 'string', 'format': 'binary'}}},
        },
        **responses.gen_responses(
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
    },
)
async def speech_create(body: schemas.speech.SpeechCreate, current_user: User):
    return await controllers.speech.speak(current_user, body)


@router.post(
    '/speech/prewarm',
    summary='speech prewarm',
    dependencies=[permission.PermsRequired([]), fastapi.Depends(controllers.speech.limit_ip)],
    response_model=schemas.speech.PrewarmGet,
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
async def speech_prewarm(body: schemas.speech.PrewarmCreate, current_user: User):
    return await controllers.speech.prewarm(current_user, body)


@router.get(
    '/capabilities',
    summary='Sanitized provider capabilities',
    dependencies=[permission.NoPermsRequired()],
    response_model=schemas.speech.CapabilitiesGet,
    response_description='Configuration presence, not live verification',
    responses=responses.gen_responses([]),
)
async def capabilities_get():
    return controllers.speech.capabilities()
