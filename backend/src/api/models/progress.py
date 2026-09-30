import uuid

import sqlalchemy as sa

from ...core import postgres
from .. import models


@postgres.session
async def progress_summary(session, user_id: uuid.UUID, recent_limit: int) -> dict:
    sessions = models.workout_sessions.WorkoutSessions
    sets = models.workout_sessions.WorkoutSetResults
    exercises = models.exercises.Exercises
    counters = ['total_reps', 'accepted_reps', 'duration_ms']
    errors = ['depth_insufficient', 'too_fast', 'incomplete_extension']
    totals = await session.fetch_one(
        sa.select(
            sa.func.count().label('completed_sessions'),
            *[
                sa.func.coalesce(sa.func.sum(sessions.c.summary[key].as_integer()), 0).label(
                    key,
                )
                for key in counters
            ],
            *[
                sa.func.coalesce(
                    sa.func.sum(sessions.c.summary['error_counts'][key].as_integer()),
                    0,
                ).label(key)
                for key in errors
            ],
        ).where(
            sessions.c.user_id == user_id,
            sessions.c.status == 'completed',
        ),
    )
    exercise_key = (
        sa.select(exercises.c.key)
        .select_from(sets.join(exercises))
        .where(sets.c.session_id == sessions.c.id)
        .order_by(sets.c.set_index)
        .limit(1)
        .scalar_subquery()
    )
    recent = await session.fetch_all(
        sa.select(
            sessions.c.id,
            sessions.c.completed_at,
            exercise_key.label('exercise_key'),
            *[sessions.c.summary[key].as_integer().label(key) for key in counters],
            sessions.c.summary['error_counts'].label('error_counts'),
        )
        .where(
            sessions.c.user_id == user_id,
            sessions.c.status == 'completed',
        )
        .order_by(
            sessions.c.completed_at.desc(),
            sessions.c.id.desc(),
        )
        .limit(recent_limit),
    )
    totals['error_counts'] = {key: totals.pop(key) for key in errors}
    totals['recent_sessions'] = recent
    totals.pop('duration_ms')
    return totals
