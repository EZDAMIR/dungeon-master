import datetime
import zoneinfo

from .. import controllers
from .. import exceptions
from .. import models
from .. import responses
from .. import schemas

DAY_SCHEDULES = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 5],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
}


class PlanConflictStatus(responses.Status):
    NO_ELIGIBLE_EXERCISES = 'no_eligible_exercises'
    GENERATION_CONFLICT = 'plan_generation_conflict'


class PlanConflictResponse(responses.APIResponseConflict):
    """409 No eligible exercises or a concurrent plan-generation conflict."""

    status: PlanConflictStatus


def build_weekly_plan(profile: dict, eligible: list[dict], starts_on: datetime.date) -> dict:
    exercise = sorted(eligible, key=lambda row: row['key'])[0]
    return {
        'plan': {
            'source': 'deterministic',
            'starts_on': starts_on.isoformat(),
            'rationale': f'{profile["goal"]}; {profile["experience_level"]}; {profile["days_per_week"]} days/week; equipment: {", ".join(profile["equipment"])}. One controlled practice set per day.',
            'generator_version': 'deterministic-v1',
        },
        'items': [
            {
                'exercise_id': str(exercise['id']),
                'day_index': day,
                'position': 0,
                'sets': 1,
                'target_reps': 5,
                'rest_seconds': 60,
                'tempo_hint': 'controlled',
                'scheduled_at': None,
            }
            for day in DAY_SCHEDULES[profile['days_per_week']]
        ],
    }


async def generate(
    current_user: schemas.UserCurrent,
    ai_metadata: dict | None = None,
    job_guard: dict | None = None,
) -> dict:
    profile = await controllers.profiles.get_profile(current_user)
    eligible = controllers.exercises.eligible_exercises(
        await models.exercises.exercise_list(),
        profile,
    )
    if not eligible:
        raise exceptions.HTTPConflictException(
            detail='No eligible supported exercises for this profile',
            status=PlanConflictStatus.NO_ELIGIBLE_EXERCISES,
        )
    today = datetime.datetime.now(zoneinfo.ZoneInfo(profile['timezone'])).date()
    data = build_weekly_plan(
        profile,
        eligible,
        today - datetime.timedelta(days=today.weekday()),
    )
    if ai_metadata is not None:
        data['plan']['ai_metadata'] = ai_metadata
    try:
        return await models.training_plans.plan_create_active(
            current_user.id,
            data['plan'],
            data['items'],
            job_guard=job_guard,
        )
    except models.PlanGenerationConflict as exc:
        raise exceptions.HTTPConflictException(
            detail='Plan generation conflicted; retry',
            status=PlanConflictStatus.GENERATION_CONFLICT,
        ) from exc


async def current(current_user: schemas.UserCurrent) -> dict:
    try:
        return await models.training_plans.plan_get(current_user.id)
    except models.PlanDoesNotExist as exc:
        raise exceptions.HTTPNotFoundException(detail='No active plan') from exc


async def generate_requested(
    current_user: schemas.UserCurrent, body: schemas.training_plans.PlanGenerate | None
) -> dict:
    if body is not None and body.mode == 'ai_assisted':
        return await controllers.ai_coach.generate_plan(current_user)
    return await generate(current_user)
