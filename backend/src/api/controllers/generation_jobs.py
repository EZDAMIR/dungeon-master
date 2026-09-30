import asyncio
import contextlib
import uuid

from ...core import config
from .. import controllers
from .. import exceptions
from .. import models
from .. import schemas


async def create(
    current_user: schemas.UserCurrent, body: schemas.generation_jobs.JobCreate
) -> dict:
    if body.execution_mode == 'fixture' and not config.get_settings().ENABLE_FIXTURE_MODE:
        raise exceptions.HTTPForbiddenException(detail='Fixture mode disabled')
    await controllers.speech.budget(
        current_user.id, 'generation', 1, config.get_settings().COACH_DAILY_REQUEST_CAP
    )
    data = await controllers.coach.context(current_user)
    try:
        return await models.generation_jobs.create(
            current_user.id,
            {
                'operation_id': body.operation_id,
                'execution_mode': body.execution_mode,
                'input_revision': data['revision'],
            },
        )
    except models.ProposalConflict as exc:
        raise exceptions.HTTPConflictException(
            detail='Generation operation reused with changed context'
        ) from exc


async def get(current_user: schemas.UserCurrent, job_id: uuid.UUID) -> dict:
    try:
        return await models.generation_jobs.get(current_user.id, job_id)
    except models.JobNotFound as exc:
        raise exceptions.HTTPNotFoundException(detail='Generation job not found') from exc


async def cancel(
    current_user: schemas.UserCurrent, job_id: uuid.UUID, body: schemas.coach.Operation
) -> dict:
    try:
        return await models.generation_jobs.cancel(current_user.id, job_id)
    except models.JobNotFound as exc:
        raise exceptions.HTTPNotFoundException(detail='Generation job not found') from exc


async def run_once() -> bool:
    settings = config.get_settings()
    job = await models.generation_jobs.claim(settings.GENERATION_JOB_TIMEOUT_SECONDS + 30)
    if not job:
        return False
    current_user = schemas.UserCurrent(id=job['user_id'], email=None, permissions=[])

    async def stage(name, completed=0, total=0):
        await models.generation_jobs.update(
            job['id'],
            job['lease_id'],
            {'stage': name, 'completed_specs': completed, 'total_specs': total},
        )

    try:
        async with asyncio.timeout(settings.GENERATION_JOB_TIMEOUT_SECONDS):
            context = await controllers.coach.context(current_user)
            if context['revision'] != job['input_revision']:
                await models.generation_jobs.update(
                    job['id'],
                    job['lease_id'],
                    {'status': 'failed', 'error_category': 'stale_context'},
                )
                return True
            guard = {'job_id': job['id'], 'lease_id': job['lease_id']}
            plan = await controllers.ai_coach.generate_plan(
                current_user,
                execution_mode=job['execution_mode'],
                on_stage=stage,
                job_guard=guard,
            )
            # AI/fallback plan persistence finishes the job in its transaction.
            row = await get(current_user, job['id'])
            if row['status'] == 'running':
                await models.generation_jobs.update(
                    job['id'],
                    job['lease_id'],
                    {
                        'status': 'fallback'
                        if plan.get('ai_metadata', {}).get('status') == 'fallback'
                        else 'completed',
                        'stage': 'completed',
                        'result_plan_id': plan['id'],
                    },
                )
    except models.JobCancelled:
        pass
    except (TimeoutError, exceptions.AppException, ValueError) as exc:
        with contextlib.suppress(models.JobCancelled):
            await models.generation_jobs.update(
                job['id'],
                job['lease_id'],
                {
                    'status': 'failed',
                    'error_category': 'timeout'
                    if isinstance(exc, TimeoutError)
                    else 'generation_failed',
                },
            )
    return True
