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


@router.post(
    '/generation-jobs',
    summary='generation job create',
    dependencies=[permission.PermsRequired([]), fastapi.Depends(controllers.speech.limit_ip)],
    response_model=schemas.generation_jobs.JobGet,
    response_description='Owned result',
    status_code=202,
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
async def generation_job_create(body: schemas.generation_jobs.JobCreate, current_user: User):
    return await controllers.generation_jobs.create(current_user, body)


@router.get(
    '/generation-jobs/{job_id}',
    summary='generation job get',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.generation_jobs.JobGet,
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
async def generation_job_get(job_id: uuid.UUID, current_user: User):
    return await controllers.generation_jobs.get(current_user, job_id)


@router.post(
    '/generation-jobs/{job_id}/cancel',
    summary='generation job cancel',
    dependencies=[permission.PermsRequired([]), fastapi.Depends(controllers.speech.limit_ip)],
    response_model=schemas.generation_jobs.JobGet,
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
async def generation_job_cancel(
    body: schemas.coach.Operation, job_id: uuid.UUID, current_user: User
):
    return await controllers.generation_jobs.cancel(current_user, job_id, body)
