"""Sprint 4A durable personalization; transactions stay in this model."""

import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from ...core import postgres
from .. import models


class AISourceNotFound(Exception):
    pass


class AIDocumentLimit(Exception):
    pass


class AIContextChanged(Exception):
    pass


def identity_columns():
    return [
        sa.Column('id', sa.UUID, primary_key=True, default=uuid.uuid4),
        sa.Column(
            'user_id',
            sa.UUID,
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
            index=True,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    ]


def updated_column():
    return sa.Column(
        'updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
    )


UserAIContext = sa.Table(
    'user_ai_context',
    postgres.metadata,
    *identity_columns(),
    updated_column(),
    sa.Column('self_description', sa.Text, nullable=False),
    sa.Column(
        'preferred_coach_style',
        pg.ENUM('calm', 'energetic', 'strict', 'supportive', name='ai_context_style_enum'),
        nullable=False,
    ),
    sa.Column(
        'preferred_language',
        pg.ENUM('ru', 'kk', 'en', name='ai_context_language_enum'),
        nullable=False,
    ),
    sa.Column('additional_preferences', pg.JSONB, nullable=False),
    sa.UniqueConstraint('user_id', name='uq_ai_context_user'),
    sa.CheckConstraint(
        sa.func.length(sa.column('self_description')) <= 5000,
        name='ck_ai_context_description_length',
    ),
)
UserDocuments = sa.Table(
    'user_documents',
    postgres.metadata,
    *identity_columns(),
    updated_column(),
    sa.Column('filename', sa.Text, nullable=False),
    sa.Column('media_type', sa.Text, nullable=False),
    sa.Column('size_bytes', sa.Integer, nullable=False),
    sa.Column('extracted_text', sa.Text, nullable=False),
    sa.Column(
        'status',
        pg.ENUM('uploaded', 'processed', 'failed', name='user_documents_status_enum'),
        nullable=False,
    ),
    sa.Column('message', sa.Text, nullable=True),
    sa.CheckConstraint(sa.column('size_bytes').between(0, 5242880), name='ck_documents_size'),
    sa.CheckConstraint(
        sa.func.length(sa.column('filename')).between(1, 255),
        name='ck_documents_filename_length',
    ),
    sa.CheckConstraint(
        sa.func.length(sa.column('extracted_text')) <= 50000, name='ck_documents_text_length'
    ),
)
DocumentChunks = sa.Table(
    'document_chunks',
    postgres.metadata,
    *identity_columns(),
    sa.Column(
        'document_id',
        sa.UUID,
        sa.ForeignKey('user_documents.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    ),
    sa.Column('chunk_index', sa.Integer, nullable=False),
    sa.Column('content', sa.Text, nullable=False),
    sa.Column('embedding', pg.JSONB, nullable=True),
    sa.UniqueConstraint('document_id', 'chunk_index', name='uq_document_chunks_index'),
    sa.CheckConstraint(
        sa.column('chunk_index').between(0, 29), name='ck_document_chunks_index'
    ),
    sa.CheckConstraint(
        sa.func.length(sa.column('content')) <= 1800, name='ck_document_chunks_length'
    ),
)
DocumentFacts = sa.Table(
    'document_facts',
    postgres.metadata,
    *identity_columns(),
    sa.Column(
        'document_id',
        sa.UUID,
        sa.ForeignKey('user_documents.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    ),
    sa.Column('normalized_fact', sa.Text, nullable=False),
    sa.Column('source_excerpt', sa.Text, nullable=False),
    sa.Column('constraint_code', sa.Text, nullable=True),
    sa.Column(
        'status',
        pg.ENUM('pending', 'confirmed', 'rejected', name='document_facts_status_enum'),
        nullable=False,
    ),
    sa.CheckConstraint(
        sa.func.length(sa.column('normalized_fact')) <= 120, name='ck_document_facts_length'
    ),
    sa.CheckConstraint(
        sa.func.length(sa.column('source_excerpt')) <= 240,
        name='ck_document_facts_excerpt_length',
    ),
)
AIUserProfiles = sa.Table(
    'ai_user_profiles',
    postgres.metadata,
    *identity_columns(),
    sa.Column('version', sa.Integer, nullable=False),
    sa.Column('profile', pg.JSONB, nullable=False),
    sa.Column('source_document_ids', pg.JSONB, nullable=False),
    sa.Column('model', sa.Text, nullable=False),
    sa.Column('input_revision', sa.Text, nullable=True),
    sa.Column('provenance', pg.JSONB, nullable=True),
    sa.Column(
        'status',
        pg.ENUM('completed', 'fallback', 'synthetic', name='ai_profiles_status_enum'),
        nullable=False,
    ),
    sa.UniqueConstraint('user_id', 'version', name='uq_ai_profile_version'),
    sa.CheckConstraint(sa.column('version') >= 1, name='ck_ai_profiles_version'),
)
AIExerciseSpecs = sa.Table(
    'ai_exercise_specs',
    postgres.metadata,
    *identity_columns(),
    updated_column(),
    sa.Column('exercise_key', sa.Text, sa.ForeignKey('exercises.key'), nullable=False),
    sa.Column('display_name', sa.Text, nullable=False),
    sa.Column('description', sa.Text, nullable=False),
    sa.Column('difficulty', sa.Text, nullable=False),
    sa.Column('equipment_codes', pg.JSONB, nullable=False),
    sa.Column('camera_angle', sa.Text, nullable=False),
    sa.Column('movement_spec', pg.JSONB, nullable=True),
    sa.Column('generated_by_model', sa.Text, nullable=False),
    sa.Column(
        'status',
        pg.ENUM(
            'generated',
            'valid',
            'invalid',
            'manual_only',
            name='ai_exercise_specs_status_enum',
        ),
        nullable=False,
    ),
    sa.Column('validation_errors', pg.JSONB, nullable=False),
    sa.UniqueConstraint('exercise_key', name='uq_ai_exercise_specs_key'),
    sa.CheckConstraint(
        sa.func.length(sa.column('display_name')).between(1, 48),
        name='ck_ai_specs_name_length',
    ),
)
AIExerciseSpecRevisions = sa.Table(
    'ai_exercise_spec_revisions',
    postgres.metadata,
    *identity_columns(),
    sa.Column(
        'exercise_key', sa.Text, sa.ForeignKey('exercises.key'), nullable=False, index=True
    ),
    sa.Column('movement_spec', pg.JSONB, nullable=True),
)


AIPlanRuns = sa.Table(
    'ai_plan_runs',
    postgres.metadata,
    *identity_columns(),
    sa.Column('model', sa.Text, nullable=False),
    sa.Column('profile_snapshot', pg.JSONB, nullable=False),
    sa.Column('retrieved_chunk_ids', pg.JSONB, nullable=False),
    sa.Column('output', pg.JSONB, nullable=False),
    sa.Column(
        'status',
        pg.ENUM('completed', 'fallback', 'failed', name='ai_plan_runs_status_enum'),
        nullable=False,
    ),
)


@postgres.session
async def context_get(session, user_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        UserAIContext.select().where(UserAIContext.c.user_id == user_id)
    )
    if row is None:
        raise AISourceNotFound
    return row


@postgres.session
async def context_replace(session, user_id: uuid.UUID, data: dict) -> dict:
    async with session.transaction():
        statement = pg.insert(UserAIContext).values(user_id=user_id, **data)
        row = await session.fetch_one(
            statement.on_conflict_do_update(
                constraint='uq_ai_context_user',
                set_={**data, 'updated_at': sa.func.now()},
            ).returning(UserAIContext)
        )
        await invalidate_personalization(session, user_id)
        return row


@postgres.session
async def document_create(
    session, user_id: uuid.UUID, data: dict, chunks: list[str], facts: list[dict], limit: int
) -> dict:
    async with session.transaction():
        await session.execute(
            models.users.Users.update()
            .where(models.users.Users.c.id == user_id)
            .values(updated_at=sa.func.now())
        )
        count = await session.fetch_one(
            sa.select(sa.func.count().label('n')).where(UserDocuments.c.user_id == user_id)
        )
        if count['n'] >= limit:
            raise AIDocumentLimit
        row = await session.fetch_one(
            UserDocuments.insert().values(user_id=user_id, **data).returning(UserDocuments)
        )
        if chunks:
            await session.execute(
                DocumentChunks.insert().values(
                    [
                        {
                            'user_id': user_id,
                            'document_id': row['id'],
                            'chunk_index': index,
                            'content': content,
                            'embedding': None,
                        }
                        for index, content in enumerate(chunks)
                    ]
                )
            )
        if facts:
            await session.execute(
                DocumentFacts.insert().values(
                    [
                        {
                            **fact,
                            'user_id': user_id,
                            'document_id': row['id'],
                            'status': 'pending',
                        }
                        for fact in facts
                    ]
                )
            )
        return await document_get(session, user_id, row['id'])


@postgres.session
async def document_get(session, user_id: uuid.UUID, document_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        UserDocuments.select().where(
            UserDocuments.c.user_id == user_id, UserDocuments.c.id == document_id
        )
    )
    if row is None:
        raise AISourceNotFound
    row['extracted_character_count'] = len(row.pop('extracted_text'))
    row['facts'] = await session.fetch_all(
        DocumentFacts.select()
        .where(DocumentFacts.c.user_id == user_id, DocumentFacts.c.document_id == document_id)
        .order_by(DocumentFacts.c.created_at, DocumentFacts.c.id)
    )
    return row


@postgres.session
async def documents_list(session, user_id: uuid.UUID) -> list[dict]:
    rows = await session.fetch_all(
        sa.select(UserDocuments.c.id)
        .where(UserDocuments.c.user_id == user_id)
        .order_by(UserDocuments.c.created_at)
    )
    return [await document_get(session, user_id, row['id']) for row in rows]


@postgres.session
async def fact_decide(
    session, user_id: uuid.UUID, document_id: uuid.UUID, fact_id: uuid.UUID, status: str
) -> dict:
    async with session.transaction():
        row = await session.fetch_one(
            DocumentFacts.update()
            .where(
                DocumentFacts.c.user_id == user_id,
                DocumentFacts.c.document_id == document_id,
                DocumentFacts.c.id == fact_id,
            )
            .values(status=status)
            .returning(DocumentFacts)
        )
        if row is None:
            raise AISourceNotFound
        await invalidate_personalization(session, user_id)
        return row


@postgres.session
async def document_delete(session, user_id: uuid.UUID, document_id: uuid.UUID) -> dict:
    async with session.transaction():
        row = await session.fetch_one(
            UserDocuments.delete()
            .where(UserDocuments.c.user_id == user_id, UserDocuments.c.id == document_id)
            .returning(UserDocuments.c.id)
        )
        if row is None:
            raise AISourceNotFound
        await invalidate_personalization(session, user_id)
        return row


@postgres.session
async def source_snapshot(session, user_id: uuid.UUID) -> dict:
    return {
        'facts': await session.fetch_all(
            DocumentFacts.select()
            .where(DocumentFacts.c.user_id == user_id, DocumentFacts.c.status == 'confirmed')
            .order_by(DocumentFacts.c.id)
        ),
        'chunks': await session.fetch_all(
            DocumentChunks.select()
            .where(DocumentChunks.c.user_id == user_id)
            .order_by(DocumentChunks.c.document_id, DocumentChunks.c.chunk_index)
        ),
    }


@postgres.session
async def embeddings_save(session, user_id: uuid.UUID, values: list[dict]) -> dict:
    async with session.transaction():
        for value in values:
            await session.execute(
                DocumentChunks.update()
                .where(DocumentChunks.c.user_id == user_id, DocumentChunks.c.id == value['id'])
                .values(embedding=value['embedding'])
            )
    return {'applied': True}


@postgres.session
async def profile_current(session, user_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        AIUserProfiles.select()
        .where(AIUserProfiles.c.user_id == user_id)
        .order_by(AIUserProfiles.c.version.desc())
        .limit(1)
    )
    if row is None:
        raise AISourceNotFound
    return row


@postgres.session
async def profile_create(
    session,
    user_id: uuid.UUID,
    data: dict,
    context_id: uuid.UUID,
    facts: list[dict],
    context_updated_at,
) -> dict:
    async with session.transaction():
        await session.execute(
            models.users.Users.update()
            .where(models.users.Users.c.id == user_id)
            .values(updated_at=sa.func.now())
        )
        current = await source_snapshot(session, user_id)
        context = await context_get(session, user_id)
        expected = {(str(f['id']), f['status']) for f in facts}
        observed = {(str(f['id']), f['status']) for f in current['facts']}
        if (
            context['id'] != context_id
            or context['updated_at'] != context_updated_at
            or expected != observed
        ):
            raise AIContextChanged
        version = await session.fetch_one(
            sa.select(
                sa.func.coalesce(sa.func.max(AIUserProfiles.c.version), 0).label('n')
            ).where(AIUserProfiles.c.user_id == user_id)
        )
        return await session.fetch_one(
            AIUserProfiles.insert()
            .values(**data, user_id=user_id, version=version['n'] + 1)
            .returning(AIUserProfiles)
        )


@postgres.session
async def spec_get(session, user_id: uuid.UUID, exercise_key: str) -> dict:
    row = await session.fetch_one(
        AIExerciseSpecs.select().where(
            AIExerciseSpecs.c.user_id == user_id,
            AIExerciseSpecs.c.exercise_key == exercise_key,
        )
    )
    if row is None:
        raise AISourceNotFound
    return {**row, 'spec_revision': row['id']}


@postgres.session
async def spec_revision_get(
    session, user_id: uuid.UUID, exercise_key: str, revision: uuid.UUID
) -> dict:
    row = await session.fetch_one(
        AIExerciseSpecRevisions.select().where(
            AIExerciseSpecRevisions.c.user_id == user_id,
            AIExerciseSpecRevisions.c.exercise_key == exercise_key,
            AIExerciseSpecRevisions.c.id == revision,
        )
    )
    if row is None:
        raise AISourceNotFound
    return row


@postgres.session
async def spec_save(session, user_id: uuid.UUID, exercise: dict, spec: dict) -> dict:
    async with session.transaction():
        catalog = {
            key: exercise[key]
            for key in [
                'key',
                'name',
                'difficulty',
                'equipment_codes',
                'impact_level',
                'camera_angle',
                'contraindication_tags',
                'analysis_profile',
            ]
        }
        statement = pg.insert(models.exercises.Exercises).values(
            **catalog, owner_user_id=user_id
        )
        await session.execute(statement.on_conflict_do_nothing(constraint='uq_exercises_key'))
        owner = await session.fetch_one(
            models.exercises.Exercises.select().where(
                models.exercises.Exercises.c.key == exercise['key'],
                models.exercises.Exercises.c.owner_user_id == user_id,
            )
        )
        if owner is None:
            raise AISourceNotFound
        revision_id = uuid.uuid4()
        statement = pg.insert(AIExerciseSpecs).values(id=revision_id, user_id=user_id, **spec)
        await session.execute(
            statement.on_conflict_do_update(
                constraint='uq_ai_exercise_specs_key',
                set_={**spec, 'id': revision_id, 'updated_at': sa.func.now()},
                where=AIExerciseSpecs.c.user_id == user_id,
            )
        )
        await session.execute(
            AIExerciseSpecRevisions.insert().values(
                id=revision_id,
                user_id=user_id,
                exercise_key=exercise['key'],
                movement_spec=spec['movement_spec'],
            )
        )
        return await spec_get(session, user_id, exercise['key'])


@postgres.session
async def plan_persist(
    session,
    user_id: uuid.UUID,
    plan: dict,
    items: list[dict],
    run: dict,
    profile_id: uuid.UUID,
    *,
    job_guard: dict | None = None,
) -> dict:
    items = [dict(item) for item in items]
    async with session.transaction():
        profile = await session.fetch_one(
            AIUserProfiles.select().where(
                AIUserProfiles.c.id == profile_id, AIUserProfiles.c.user_id == user_id
            )
        )
        if profile is None:
            raise AIContextChanged
        for item in items:
            exercise = await session.fetch_one(
                models.exercises.Exercises.select().where(
                    models.exercises.Exercises.c.key == item.pop('exercise_key'),
                    sa.or_(
                        models.exercises.Exercises.c.owner_user_id == user_id,
                        models.exercises.Exercises.c.owner_user_id.is_(None),
                    ),
                )
            )
            if exercise is None:
                raise AISourceNotFound
            item['exercise_id'] = str(exercise['id'])
        await session.execute(AIPlanRuns.insert().values(user_id=user_id, **run))
        return await models.training_plans.plan_create_active(
            session, user_id, plan, items, job_guard=job_guard
        )


@postgres.session
async def run_create(session, user_id: uuid.UUID, data: dict) -> dict:
    return await session.fetch_one(
        AIPlanRuns.insert().values(user_id=user_id, **data).returning(AIPlanRuns)
    )


@postgres.session
async def invalidate_personalization(session, user_id: uuid.UUID) -> None:
    await session.execute(
        models.coach.CoachProposals.update()
        .where(
            models.coach.CoachProposals.c.user_id == user_id,
            models.coach.CoachProposals.c.status == 'pending',
        )
        .values(expires_at=sa.func.now())
    )
    await session.execute(AIUserProfiles.delete().where(AIUserProfiles.c.user_id == user_id))
    await session.execute(
        models.training_plans.TrainingPlans.update()
        .where(
            models.training_plans.TrainingPlans.c.user_id == user_id,
            models.training_plans.TrainingPlans.c.source == 'ai_assisted',
            models.training_plans.TrainingPlans.c.status == 'active',
        )
        .values(status='archived', updated_at=sa.func.now())
    )
