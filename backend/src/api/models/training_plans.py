import datetime
import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from ...core import postgres
from .. import models


class PlanDoesNotExist(Exception):
    pass


class PlanGenerationConflict(Exception):
    pass


TrainingPlans = sa.Table(
    'training_plans',
    postgres.metadata,
    sa.Column('id', sa.UUID, primary_key=True, default=uuid.uuid4),
    sa.Column(
        'user_id',
        sa.UUID,
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    ),
    sa.Column(
        'status',
        pg.ENUM('draft', 'active', 'completed', 'archived', name='training_plans_status_enum'),
        nullable=False,
    ),
    sa.Column(
        'source',
        pg.ENUM('deterministic', 'ai_assisted', name='training_plans_source_enum'),
        nullable=False,
    ),
    sa.Column('starts_on', sa.Date, nullable=False),
    sa.Column('rationale', sa.Text, nullable=False),
    sa.Column('generator_version', sa.Text, nullable=False),
    sa.Column('ai_metadata', pg.JSONB, nullable=True),
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
    sa.CheckConstraint(
        sa.func.length(sa.column('rationale')) <= 500,
        name='ck_training_plans_rationale_length',
    ),
    sa.CheckConstraint(
        sa.func.length(sa.column('generator_version')) <= 50,
        name='ck_training_plans_generator_version_length',
    ),
)
sa.Index(
    'uq_training_plans_active_user',
    TrainingPlans.c.user_id,
    unique=True,
    postgresql_where=TrainingPlans.c.status == 'active',
)
TrainingPlanItems = sa.Table(
    'training_plan_items',
    postgres.metadata,
    sa.Column('id', sa.UUID, primary_key=True, default=uuid.uuid4),
    sa.Column(
        'plan_id',
        sa.UUID,
        sa.ForeignKey('training_plans.id', ondelete='CASCADE'),
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
    sa.Column('day_index', sa.Integer, nullable=False),
    sa.Column('position', sa.Integer, nullable=False),
    sa.Column('sets', sa.Integer, nullable=False),
    sa.Column('target_reps', sa.Integer, nullable=False),
    sa.Column('rest_seconds', sa.Integer, nullable=False),
    sa.Column('tempo_hint', sa.Text, nullable=True),
    sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
    sa.CheckConstraint(sa.column('day_index').between(0, 6), name='ck_plan_items_day'),
    sa.CheckConstraint(sa.column('position') >= 0, name='ck_plan_items_position'),
    sa.CheckConstraint(sa.column('sets').between(1, 10), name='ck_plan_items_sets'),
    sa.CheckConstraint(sa.column('target_reps').between(1, 100), name='ck_plan_items_reps'),
    sa.CheckConstraint(sa.column('rest_seconds').between(0, 600), name='ck_plan_items_rest'),
    sa.UniqueConstraint('plan_id', 'day_index', 'position', name='uq_plan_items_position'),
    sa.CheckConstraint(
        sa.func.length(sa.column('tempo_hint')) <= 80,
        name='ck_training_plan_items_tempo_hint_length',
    ),
)


@postgres.session
async def plan_get(session, user_id: uuid.UUID, plan_id: uuid.UUID | None = None) -> dict:
    query = TrainingPlans.select().where(TrainingPlans.c.user_id == user_id)
    query = (
        query.where(TrainingPlans.c.id == plan_id)
        if plan_id is not None
        else query.where(TrainingPlans.c.status == 'active')
    )
    plan = await session.fetch_one(query)
    if plan is None:
        raise PlanDoesNotExist
    rows = await session.fetch_all(
        sa.select(TrainingPlanItems, models.exercises.Exercises.c.key)
        .join(models.exercises.Exercises)
        .where(TrainingPlanItems.c.plan_id == plan['id'])
        .order_by(
            TrainingPlanItems.c.day_index,
            TrainingPlanItems.c.position,
        ),
    )
    exercises = await session.fetch_all(
        models.exercises.Exercises.select().where(
            models.exercises.Exercises.c.id.in_([row['exercise_id'] for row in rows]),
        ),
    )
    catalog = {row['id']: row for row in exercises}
    plan['items'] = [{**row, 'exercise': catalog[row['exercise_id']]} for row in rows]
    return plan


@postgres.session
async def plan_create_active(
    session,
    user_id: uuid.UUID,
    data: dict,
    items: list[dict],
    *,
    job_guard: dict | None = None,
) -> dict:
    try:
        async with session.transaction():
            if job_guard:
                await models.generation_jobs.update(
                    session,
                    job_guard['job_id'],
                    job_guard['lease_id'],
                    {'stage': 'persisting'},
                )
            # A normal guarded write serializes generation per user, including an empty history.
            await session.execute(
                models.users.Users.update()
                .where(models.users.Users.c.id == user_id)
                .values(
                    updated_at=sa.func.now(),
                ),
            )
            await session.execute(
                TrainingPlans.update()
                .where(
                    TrainingPlans.c.user_id == user_id,
                    TrainingPlans.c.status == 'active',
                )
                .values(
                    status='archived',
                    updated_at=sa.func.now(),
                ),
            )
            plan = await session.fetch_one(
                TrainingPlans.insert()
                .values(
                    **{**data, 'starts_on': datetime.date.fromisoformat(data['starts_on'])},
                    user_id=user_id,
                    status='active',
                )
                .returning(TrainingPlans),
            )
            await session.execute(
                TrainingPlanItems.insert().values(
                    [
                        {
                            **item,
                            'plan_id': plan['id'],
                            'exercise_id': uuid.UUID(str(item['exercise_id'])),
                        }
                        for item in items
                    ],
                ),
            )
            if job_guard:
                await models.generation_jobs.update(
                    session,
                    job_guard['job_id'],
                    job_guard['lease_id'],
                    {
                        'status': 'fallback'
                        if (data.get('ai_metadata') or {}).get('status') == 'fallback'
                        else 'completed',
                        'stage': 'completed',
                        'result_plan_id': plan['id'],
                    },
                )
            return await plan_get(session, user_id, plan['id'])
    except sa.exc.IntegrityError as exc:
        if (
            getattr(exc.orig.__cause__, 'constraint_name', None)
            == 'uq_training_plans_active_user'
        ):
            raise PlanGenerationConflict from exc
        raise
