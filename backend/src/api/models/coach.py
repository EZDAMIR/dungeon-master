"""Owner-scoped conversations, expiring proposals and durable provider budgets."""

import copy
import datetime
import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from ...core import postgres
from .. import models


class CoachNotFound(Exception):
    pass


class ProposalConflict(Exception):
    pass


class BudgetExceeded(Exception):
    pass


CoachPreferences = sa.Table(
    'coach_preferences',
    postgres.metadata,
    sa.Column(
        'user_id', sa.UUID, sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True
    ),
    sa.Column('voice_id', sa.Text, nullable=True),
    sa.Column(
        'language',
        pg.ENUM('ru', 'kk', 'en', name='coach_preferences_language_enum'),
        nullable=False,
    ),
    sa.Column(
        'style',
        pg.ENUM(
            'calm', 'supportive', 'energetic', 'strict', name='coach_preferences_style_enum'
        ),
        nullable=False,
    ),
    sa.Column('audio_enabled', sa.Boolean, nullable=False),
    sa.Column('revision', sa.Integer, nullable=False, server_default='0'),
    sa.CheckConstraint(sa.column('revision') >= 0, name='ck_coach_preferences_revision'),
)
CoachConversations = sa.Table(
    'coach_conversations',
    postgres.metadata,
    *models.ai_coach.identity_columns(),
)
CoachMessages = sa.Table(
    'coach_messages',
    postgres.metadata,
    *models.ai_coach.identity_columns(),
    sa.Column(
        'conversation_id',
        sa.UUID,
        sa.ForeignKey('coach_conversations.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    ),
    sa.Column('operation_id', sa.UUID, nullable=False),
    sa.Column('request_hash', sa.Text, nullable=False),
    sa.Column('answer', pg.JSONB, nullable=False),
    sa.UniqueConstraint('user_id', 'operation_id', name='uq_coach_message_operation'),
)
CoachProposals = sa.Table(
    'coach_proposals',
    postgres.metadata,
    *models.ai_coach.identity_columns(),
    sa.Column('operation_id', sa.UUID, nullable=False),
    sa.Column(
        'kind',
        pg.ENUM('schedule', 'plan_change', 'exercise_swap', name='coach_proposals_kind_enum'),
        nullable=False,
    ),
    sa.Column('payload', pg.JSONB, nullable=False),
    sa.Column('payload_hash', sa.Text, nullable=False),
    sa.Column('source_revision', sa.Text, nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column(
        'status',
        pg.ENUM('pending', 'confirmed', 'rejected', name='coach_proposals_status_enum'),
        nullable=False,
        server_default='pending',
    ),
    sa.Column('result', pg.JSONB, nullable=True),
    sa.UniqueConstraint('user_id', 'operation_id', name='uq_coach_proposal_operation'),
)
ProviderBudgets = sa.Table(
    'provider_budgets',
    postgres.metadata,
    sa.Column('scope', sa.Text, primary_key=True),
    sa.Column('day', sa.Date, primary_key=True),
    sa.Column('category', sa.Text, primary_key=True),
    sa.Column('used', sa.Integer, nullable=False),
    sa.CheckConstraint(sa.column('used') >= 0, name='ck_provider_budget_positive'),
)


@postgres.session
async def preferences_get(session, user_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        CoachPreferences.select().where(CoachPreferences.c.user_id == user_id)
    )
    return row or {
        'voice_id': None,
        'language': 'ru',
        'style': 'supportive',
        'audio_enabled': False,
        'revision': 0,
    }


@postgres.session
async def preferences_replace(session, user_id: uuid.UUID, data: dict) -> dict:
    async with session.transaction():
        stmt = pg.insert(CoachPreferences).values(user_id=user_id, **data, revision=1)
        return await session.fetch_one(
            stmt.on_conflict_do_update(
                index_elements=['user_id'],
                set_={**data, 'revision': CoachPreferences.c.revision + 1},
            ).returning(CoachPreferences)
        )


@postgres.session
async def budget_take(session, scope: str, category: str, units: int, limit: int) -> dict:
    day = datetime.datetime.now(datetime.UTC).date()
    if units > limit:
        raise BudgetExceeded
    async with session.transaction():
        stmt = pg.insert(ProviderBudgets).values(
            scope=scope, day=day, category=category, used=units
        )
        row = await session.fetch_one(
            stmt.on_conflict_do_update(
                index_elements=['scope', 'day', 'category'],
                set_={'used': ProviderBudgets.c.used + units},
                where=ProviderBudgets.c.used + units <= limit,
            ).returning(ProviderBudgets)
        )
        if row is None:
            raise BudgetExceeded
        return row


@postgres.session
async def conversation_ensure(
    session, user_id: uuid.UUID, conversation_id: uuid.UUID | None
) -> dict:
    if conversation_id is not None:
        row = await session.fetch_one(
            CoachConversations.select().where(
                CoachConversations.c.id == conversation_id,
                CoachConversations.c.user_id == user_id,
            )
        )
        if row is None:
            raise CoachNotFound
        return row
    async with session.transaction():
        return await session.fetch_one(
            CoachConversations.insert().values(user_id=user_id).returning(CoachConversations)
        )


@postgres.session
async def message_by_operation(session, user_id: uuid.UUID, operation_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        CoachMessages.select().where(
            CoachMessages.c.user_id == user_id, CoachMessages.c.operation_id == operation_id
        )
    )
    return row or {}


@postgres.session
async def message_get(session, user_id: uuid.UUID, message_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        CoachMessages.select().where(
            CoachMessages.c.user_id == user_id, CoachMessages.c.id == message_id
        )
    )
    if row is None:
        raise CoachNotFound
    return row


@postgres.session
async def message_save(session, user_id: uuid.UUID, data: dict) -> dict:
    async with session.transaction():
        stmt = (
            pg.insert(CoachMessages)
            .values(user_id=user_id, **data)
            .on_conflict_do_nothing(constraint='uq_coach_message_operation')
            .returning(CoachMessages)
        )
        row = await session.fetch_one(stmt)
        if row is None:
            row = await message_by_operation(session, user_id, data['operation_id'])
            if row['request_hash'] != data['request_hash']:
                raise ProposalConflict
        return row


@postgres.session
async def proposal_create(session, user_id: uuid.UUID, data: dict) -> dict:
    async with session.transaction():
        row = await session.fetch_one(
            pg.insert(CoachProposals)
            .values(user_id=user_id, **data)
            .on_conflict_do_nothing(constraint='uq_coach_proposal_operation')
            .returning(CoachProposals)
        )
        if row is None:
            row = await session.fetch_one(
                CoachProposals.select().where(
                    CoachProposals.c.user_id == user_id,
                    CoachProposals.c.operation_id == data['operation_id'],
                )
            )
            if row['payload_hash'] != data['payload_hash'] or row['kind'] != data['kind']:
                raise ProposalConflict
        return row


@postgres.session
async def proposal_get(session, user_id: uuid.UUID, proposal_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        CoachProposals.select().where(
            CoachProposals.c.user_id == user_id, CoachProposals.c.id == proposal_id
        )
    )
    if row is None:
        raise CoachNotFound
    return row


@postgres.session
async def proposal_transition(
    session,
    user_id: uuid.UUID,
    proposal_id: uuid.UUID,
    *,
    confirm: bool,
    payload_hash: str,
    now: datetime.datetime,
) -> dict:
    async with session.transaction():
        row = await session.fetch_one(
            CoachProposals.update()
            .where(
                CoachProposals.c.id == proposal_id,
                CoachProposals.c.user_id == user_id,
                CoachProposals.c.status == 'pending',
                CoachProposals.c.payload_hash == payload_hash,
                CoachProposals.c.expires_at > now,
            )
            .values(status='confirmed' if confirm else 'rejected')
            .returning(CoachProposals)
        )
        if row is None:
            existing = await proposal_get(session, user_id, proposal_id)
            if existing['status'] == ('confirmed' if confirm else 'rejected'):
                return existing
            raise ProposalConflict
        if confirm:
            if row['kind'] == 'schedule':
                result = await models.schedule.proposal_apply(
                    session, user_id, row['payload'], int(row['source_revision']), now
                )
            else:
                result = await plan_apply(
                    session, user_id, row['kind'], row['payload'], row['source_revision']
                )
            row = await session.fetch_one(
                CoachProposals.update()
                .where(CoachProposals.c.id == proposal_id)
                .values(result=result)
                .returning(CoachProposals)
            )
        return row


@postgres.session
async def plan_apply(
    session, user_id: uuid.UUID, kind: str, payload: dict, revision: str
) -> dict:
    plans = models.training_plans.TrainingPlans
    items = models.training_plans.TrainingPlanItems
    plan_id = uuid.UUID(payload['plan_id'])
    # The proposal's revision is the persisted updated_at, never a client's claim.
    row = await session.fetch_one(
        plans.update()
        .where(
            plans.c.id == plan_id,
            plans.c.user_id == user_id,
            plans.c.status == 'active',
            plans.c.updated_at == datetime.datetime.fromisoformat(revision),
        )
        .values(updated_at=sa.func.now())
        .returning(plans)
    )
    if row is None:
        raise ProposalConflict
    if kind == 'plan_change':
        metadata = copy.deepcopy(row['ai_metadata'])
        if metadata and metadata.get('days'):
            for day in metadata['days']:
                for item in day['items']:
                    item['sets'] = payload['sets']
                    item['target_reps'] = payload['target_reps']
            metadata['user_adjusted'] = True
            await session.execute(
                plans.update().where(plans.c.id == plan_id).values(ai_metadata=metadata)
            )
        await session.execute(
            items.update()
            .where(items.c.plan_id == plan_id)
            .values(sets=payload['sets'], target_reps=payload['target_reps'])
        )
    else:
        exercise = await session.fetch_one(
            models.exercises.Exercises.select().where(
                models.exercises.Exercises.c.key == payload['exercise_key'],
                models.exercises.Exercises.c.is_active.is_(True),
                sa.or_(
                    models.exercises.Exercises.c.owner_user_id.is_(None),
                    models.exercises.Exercises.c.owner_user_id == user_id,
                ),
            )
        )
        if exercise is None:
            raise ProposalConflict
        updated = await session.fetch_one(
            items.update()
            .where(items.c.plan_id == plan_id, items.c.id == uuid.UUID(payload['item_id']))
            .values(exercise_id=exercise['id'])
            .returning(items)
        )
        if updated is None:
            raise ProposalConflict
        # The visible AI day must describe the same exercise as the durable item.
        # Match by its stable day/order, because generated metadata has no item UUID.
        metadata = copy.deepcopy(row['ai_metadata'])
        if metadata and metadata.get('days'):
            for day in metadata['days']:
                if day['day_index'] == updated['day_index']:
                    for position, item in enumerate(day['items']):
                        if position == updated['position']:
                            item.update(
                                exercise_key=exercise['key'],
                                display_name=exercise['name'],
                                description=exercise['name'],
                                instruction=exercise['name'],
                                difficulty=exercise['difficulty'],
                                equipment_codes=exercise['equipment_codes'],
                                impact_level=exercise['impact_level'],
                                contraindication_tags=exercise['contraindication_tags'],
                                camera_angle=exercise['camera_angle'],
                                camera_coaching_requested=bool(exercise['analysis_profile']),
                                camera_coaching_mode='predefined'
                                if exercise['analysis_profile']
                                else 'manual_only',
                                detail_available=True,
                                source_references=[],
                                reason='User-confirmed exercise replacement',
                            )
            metadata['user_adjusted'] = True
            await session.execute(
                plans.update().where(plans.c.id == plan_id).values(ai_metadata=metadata)
            )
    return {'plan_id': str(plan_id), 'applied': True}
