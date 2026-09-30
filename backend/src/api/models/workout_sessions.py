import datetime
import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from ...core import postgres
from .. import models


class SessionDoesNotExist(Exception):
    pass


class SessionPlanDoesNotExist(Exception):
    pass


class SessionConflict(Exception):
    pass


class SetExerciseDoesNotExist(Exception):
    pass


WorkoutSessions = sa.Table(
    'workout_sessions',
    postgres.metadata,
    sa.Column('id', sa.UUID, primary_key=True, default=uuid.uuid4),
    sa.Column('client_session_id', sa.UUID, nullable=False),
    sa.Column(
        'user_id',
        sa.UUID,
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    ),
    sa.Column(
        'plan_id',
        sa.UUID,
        sa.ForeignKey('training_plans.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    ),
    sa.Column(
        'status',
        pg.ENUM('started', 'completed', 'abandoned', name='workout_sessions_status_enum'),
        nullable=False,
        server_default='started',
    ),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('client_engine_version', sa.Text, nullable=False),
    sa.Column('summary', pg.JSONB, nullable=True),
    sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
    sa.Column(
        'updated_at',
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
    sa.UniqueConstraint('user_id', 'client_session_id', name='uq_workout_sessions_client'),
    sa.CheckConstraint(
        sa.or_(sa.column('status') != 'completed', sa.column('completed_at').is_not(None)),
        name='ck_sessions_completed_at',
    ),
    sa.CheckConstraint(
        sa.or_(
            sa.column('completed_at').is_(None),
            sa.column('completed_at') >= sa.column('started_at'),
        ),
        name='ck_sessions_time_order',
    ),
    sa.CheckConstraint(
        sa.func.length(sa.column('client_engine_version')) <= 50,
        name='ck_workout_sessions_client_engine_version_length',
    ),
)
WorkoutSetResults = sa.Table(
    'workout_set_results',
    postgres.metadata,
    sa.Column('id', sa.UUID, primary_key=True, default=uuid.uuid4),
    sa.Column('client_set_id', sa.UUID, nullable=False),
    sa.Column(
        'session_id',
        sa.UUID,
        sa.ForeignKey('workout_sessions.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    ),
    sa.Column(
        'exercise_id',
        sa.UUID,
        sa.ForeignKey('exercises.id'),
        nullable=False,
        index=True,
    ),
    sa.Column('set_index', sa.Integer, nullable=False),
    sa.Column('total_reps', sa.Integer, nullable=False),
    sa.Column('accepted_reps', sa.Integer, nullable=False),
    sa.Column('duration_ms', sa.Integer, nullable=False),
    sa.Column('error_counts', pg.JSONB, nullable=False),
    sa.Column('metrics', pg.JSONB, nullable=False),
    sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
    sa.Column(
        'updated_at',
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
    sa.UniqueConstraint('session_id', 'set_index', name='uq_set_results_index'),
    sa.UniqueConstraint('session_id', 'client_set_id', name='uq_set_results_client'),
    sa.CheckConstraint(sa.column('set_index') >= 1, name='ck_set_results_index'),
    sa.CheckConstraint(sa.column('total_reps').between(0, 500), name='ck_set_results_total'),
    sa.CheckConstraint(
        sa.column('accepted_reps').between(0, 500),
        name='ck_set_results_accepted',
    ),
    sa.CheckConstraint(
        sa.column('accepted_reps') <= sa.column('total_reps'),
        name='ck_set_results_accepted_total',
    ),
    sa.CheckConstraint(
        sa.column('duration_ms').between(0, 3_600_000),
        name='ck_set_results_duration',
    ),
)


@postgres.session
async def session_get(session, user_id: uuid.UUID, session_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        WorkoutSessions.select().where(
            WorkoutSessions.c.id == session_id,
            WorkoutSessions.c.user_id == user_id,
        ),
    )
    if row is None:
        raise SessionDoesNotExist
    return row


@postgres.session
async def session_create(session, user_id: uuid.UUID, data: dict) -> dict:
    values = {
        **data,
        'client_session_id': uuid.UUID(data['client_session_id']),
        'plan_id': uuid.UUID(data['plan_id']) if data['plan_id'] else None,
        'started_at': datetime.datetime.fromisoformat(data['started_at']),
    }
    async with session.transaction():
        await models.users.user_get(session, user_id)
        if values['plan_id'] is not None:
            try:
                await models.training_plans.plan_get(session, user_id, values['plan_id'])
            except models.PlanDoesNotExist as exc:
                raise SessionPlanDoesNotExist from exc
        inserted = await session.fetch_one(
            pg.insert(WorkoutSessions)
            .values(
                **values,
                user_id=user_id,
            )
            .on_conflict_do_nothing(
                constraint='uq_workout_sessions_client',
            )
            .returning(WorkoutSessions),
        )
        if inserted is not None:
            return inserted
        existing = await session.fetch_one(
            WorkoutSessions.select().where(
                WorkoutSessions.c.user_id == user_id,
                WorkoutSessions.c.client_session_id == values['client_session_id'],
            ),
        )
        if any(existing[key] != value for key, value in values.items()):
            raise SessionConflict
        return existing


@postgres.session
async def set_create(
    session,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    data: dict,
    *,
    exercise_key: str,
    engine_version: str,
) -> dict:
    async with session.transaction():
        parent = await session.fetch_one(
            WorkoutSessions.update()
            .where(
                WorkoutSessions.c.id == session_id,
                WorkoutSessions.c.user_id == user_id,
                WorkoutSessions.c.status == 'started',
            )
            .values(
                updated_at=sa.func.now(),
            )
            .returning(WorkoutSessions),
        )
        started = parent is not None
        if parent is None:
            parent = await session_get(session, user_id, session_id)
        if engine_version != parent['client_engine_version']:
            raise SessionConflict
        exercise = await session.fetch_one(
            models.exercises.Exercises.select().where(
                models.exercises.Exercises.c.key == exercise_key,
            ),
        )
        if exercise is None:
            raise SetExerciseDoesNotExist
        values = dict(data)
        values.update(
            client_set_id=uuid.UUID(data['client_set_id']),
            session_id=session_id,
            exercise_id=exercise['id'],
        )
        existing = await session.fetch_one(
            WorkoutSetResults.select().where(
                WorkoutSetResults.c.session_id == session_id,
                sa.or_(
                    WorkoutSetResults.c.client_set_id == values['client_set_id'],
                    WorkoutSetResults.c.set_index == values['set_index'],
                ),
            ),
        )
        if existing is not None:
            if any(existing[key] != value for key, value in values.items()):
                raise SessionConflict
            return {
                **existing,
                'exercise_key': exercise_key,
                'engine_version': parent['client_engine_version'],
            }
        if not started:
            raise SessionConflict
        if not exercise['is_active']:
            raise SetExerciseDoesNotExist
        created = await session.fetch_one(
            WorkoutSetResults.insert().values(**values).returning(WorkoutSetResults),
        )
        return {
            **created,
            'exercise_key': exercise_key,
            'engine_version': parent['client_engine_version'],
        }


@postgres.session
async def session_complete(
    session,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    data: dict,
) -> dict:
    completed_at = datetime.datetime.fromisoformat(data['completed_at'])
    async with session.transaction():
        updated = await session.fetch_one(
            WorkoutSessions.update()
            .where(
                WorkoutSessions.c.id == session_id,
                WorkoutSessions.c.user_id == user_id,
                WorkoutSessions.c.status == 'started',
                WorkoutSessions.c.started_at <= completed_at,
            )
            .values(
                status='completed',
                completed_at=completed_at,
                summary=data['summary'],
                updated_at=sa.func.now(),
            )
            .returning(WorkoutSessions),
        )
        if updated is None:
            existing = await session_get(session, user_id, session_id)
            if (
                existing['status'] == 'completed'
                and existing['completed_at'] == completed_at
                and existing['summary'] == data['summary']
            ):
                return existing
            raise SessionConflict
        rows = await session.fetch_all(
            WorkoutSetResults.select().where(WorkoutSetResults.c.session_id == session_id),
        )
        totals = {
            key: sum(row[key] for row in rows)
            for key in ['total_reps', 'accepted_reps', 'duration_ms']
        }
        totals['rejected_reps'] = totals['total_reps'] - totals['accepted_reps']
        totals['error_counts'] = {
            key: sum(row['error_counts'][key] for row in rows)
            for key in ['depth_insufficient', 'too_fast', 'incomplete_extension']
        }
        if not rows or totals != data['summary']:
            raise SessionConflict
        return updated
