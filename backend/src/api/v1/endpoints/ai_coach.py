"""Sprint 4A thin authenticated context, document and coach endpoints."""

import uuid
from typing import Annotated

import fastapi

from ... import auth
from ... import controllers
from ... import permission
from ... import responses
from ... import schemas

router = fastapi.APIRouter()
ERRORS = responses.gen_responses(
    [
        responses.APIResponseUnauthorized,
        responses.APIResponseForbidden,
        responses.APIResponseBadRequest,
        responses.APIResponseNotFound,
        responses.APIResponseConflict,
        responses.APIResponseBudgetExceeded,
    ]
)


@router.get(
    '/ai-context',
    summary='Get Sprint 4A context',
    dependencies=[permission.PermsRequired([permission.Perm.PROFILE_READ])],
    response_model=schemas.ai_coach.AIContextGet,
    response_description='Owned context',
    responses=ERRORS,
)
async def get_ai_context(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.ai_coach.get_context(current_user)


@router.put(
    '/ai-context',
    summary='Replace Sprint 4A context',
    dependencies=[permission.PermsRequired([permission.Perm.PROFILE_UPDATE])],
    response_model=schemas.ai_coach.AIContextGet,
    response_description='Replaced owned context',
    responses=ERRORS,
)
async def put_ai_context(
    body: schemas.ai_coach.AIContextUpdate,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.ai_coach.replace_context(current_user, body)


@router.post(
    '/documents',
    summary='Extract Sprint 4A document facts',
    dependencies=[permission.PermsRequired([permission.Perm.PROFILE_UPDATE])],
    response_model=schemas.ai_coach.DocumentGet,
    response_description='Owned document and pending facts',
    responses=ERRORS,
)
async def upload_document(
    file: Annotated[fastapi.UploadFile, fastapi.File()],
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.documents.upload(current_user, file)


@router.get(
    '/documents',
    summary='List Sprint 4A source documents',
    dependencies=[permission.PermsRequired([permission.Perm.PROFILE_READ])],
    response_model=list[schemas.ai_coach.DocumentGet],
    response_description='Owned sources without raw text',
    responses=ERRORS,
)
async def list_documents(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> list[dict]:
    return await controllers.documents.list_documents(current_user)


@router.delete(
    '/documents/{document_id}',
    summary='Remove Sprint 4A source',
    dependencies=[permission.PermsRequired([permission.Perm.PROFILE_UPDATE])],
    status_code=204,
    response_class=fastapi.Response,
    response_description='Source and derived facts removed',
    responses=ERRORS,
)
async def delete_document(
    document_id: uuid.UUID,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
):
    await controllers.documents.delete(current_user, document_id)


@router.put(
    '/documents/{document_id}/facts/{fact_id}',
    summary='Confirm or reject Sprint 4A fact',
    dependencies=[permission.PermsRequired([permission.Perm.PROFILE_UPDATE])],
    response_model=schemas.ai_coach.FactGet,
    response_description='Persisted source decision',
    responses=ERRORS,
)
async def review_fact(
    body: schemas.ai_coach.FactDecision,
    document_id: uuid.UUID,
    fact_id: uuid.UUID,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.documents.decide(current_user, document_id, fact_id, body)


@router.post(
    '/ai-profile/generate',
    summary='Generate Sprint 4A personalized profile',
    dependencies=[
        permission.PermsRequired([permission.Perm.PLAN_GENERATE]),
        fastapi.Depends(controllers.speech.limit_ip),
    ],
    response_model=schemas.ai_coach.AIProfileGet,
    response_description='Profile with coach persona and source highlights',
    responses=ERRORS,
)
async def generate_ai_profile(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.ai_coach.generate_profile(current_user)


@router.get(
    '/ai-profile/current',
    summary='Get Sprint 4A personalized profile',
    dependencies=[permission.PermsRequired([permission.Perm.PROFILE_READ])],
    response_model=schemas.ai_coach.AIProfileGet,
    response_description='Current owned profile',
    responses=ERRORS,
)
async def current_ai_profile(
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.ai_coach.current_profile(current_user)


@router.get(
    '/exercise-specs/{exercise_key}',
    summary='Get Sprint 4A movement specification',
    dependencies=[permission.PermsRequired([permission.Perm.EXERCISE_READ])],
    response_model=schemas.ai_coach.ExerciseSpecGet,
    response_description='Owned specification with camera capability',
    responses=ERRORS,
)
async def get_exercise_spec(
    exercise_key: str,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.ai_coach.get_spec(current_user, exercise_key)


@router.post(
    '/exercise-specs/{exercise_key}/regenerate',
    summary='Regenerate Sprint 4A movement specification',
    dependencies=[
        permission.PermsRequired([permission.Perm.PLAN_GENERATE]),
        fastapi.Depends(controllers.speech.limit_ip),
    ],
    response_model=schemas.ai_coach.ExerciseSpecGet,
    response_description='Validated or manual-only owned specification',
    responses=ERRORS,
)
async def regenerate_exercise_spec(
    exercise_key: str,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.ai_coach.regenerate_spec(current_user, exercise_key)


@router.post(
    '/demo-personas/{persona_key}/load',
    summary='Load Sprint 4A synthetic jury context',
    dependencies=[permission.PermsRequired([permission.Perm.PROFILE_UPDATE])],
    response_model=schemas.ai_coach.DemoLoadGet,
    response_description='Instant synthetic context and pending document facts',
    responses=ERRORS,
)
async def load_demo_persona(
    persona_key: schemas.ai_coach.PersonaKey,
    current_user: Annotated[schemas.UserCurrent, fastapi.Security(auth.get_current_user)],
) -> dict:
    return await controllers.demo_personas.load(current_user, persona_key)
