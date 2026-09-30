import datetime
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
    '/schedule/preferences',
    summary='schedule preferences get',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.schedule.SchedulePreferencesGet,
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
async def schedule_preferences_get(current_user: User):
    return await controllers.schedule.preferences(current_user)


@router.put(
    '/schedule/preferences',
    summary='schedule preferences replace',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.schedule.SchedulePreferencesGet,
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
async def schedule_preferences_replace(
    body: schemas.schedule.SchedulePreferencesUpdate, current_user: User
):
    return await controllers.schedule.replace_preferences(current_user, body)


@router.get(
    '/schedule',
    summary='schedule get',
    dependencies=[permission.PermsRequired([])],
    response_model=schemas.schedule.ScheduleGet,
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
async def schedule_get(current_user: User, starts_on: datetime.date | None = None):
    return await controllers.schedule.get_schedule(current_user, starts_on)


@router.post(
    '/schedule/proposals',
    summary='schedule proposal create',
    dependencies=[permission.PermsRequired([])],
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
async def schedule_proposal_create(
    body: schemas.schedule.ScheduleProposal, current_user: User
):
    return await controllers.schedule.prepare(current_user, body)


@router.get(
    '/schedule/export.ics',
    summary='Export local schedule',
    dependencies=[permission.PermsRequired([])],
    response_model=None,
    response_description='RFC5545 calendar',
    responses={
        200: {
            'description': 'Calendar file',
            'content': {'text/calendar': {'schema': {'type': 'string'}}},
        },
        **responses.gen_responses([responses.APIResponseUnauthorized]),
    },
)
async def schedule_export(current_user: User):
    return fastapi.Response(
        await controllers.schedule.export_ics(current_user),
        media_type='text/calendar',
        headers={
            'Content-Disposition': 'attachment; filename="dungeon-master.ics"',
            'Cache-Control': 'private, no-store',
        },
    )
