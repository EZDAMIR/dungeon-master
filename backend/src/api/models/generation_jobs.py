"""Durable jobs with atomic Postgres claims, bounded leases and terminal cancellation."""

import datetime
import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from ...core import postgres
from .. import models


class JobNotFound(Exception):
    pass


class JobCancelled(Exception):
    pass


GenerationJobs = sa.Table(
    'generation_jobs',
    postgres.metadata,
    *models.ai_coach.identity_columns(),
    models.ai_coach.updated_column(),
    sa.Column('operation_id', sa.UUID, nullable=False),
    sa.Column(
        'execution_mode',
        pg.ENUM('live', 'fixture', name='generation_jobs_mode_enum'),
        nullable=False,
    ),
    sa.Column('input_revision', sa.Text, nullable=False),
    sa.Column(
        'status',
        pg.ENUM(
            'queued',
            'running',
            'completed',
            'fallback',
            'failed',
            'cancelled',
            'interrupted',
            name='generation_jobs_status_enum',
        ),
        nullable=False,
        server_default='queued',
    ),
    sa.Column('stage', sa.Text, nullable=False, server_default='preparing_context'),
    sa.Column('completed_specs', sa.Integer, nullable=False, server_default='0'),
    sa.Column('total_specs', sa.Integer, nullable=False, server_default='0'),
    sa.Column(
        'result_plan_id',
        sa.UUID,
        sa.ForeignKey('training_plans.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    ),
    sa.Column('error_category', sa.Text, nullable=True),
    sa.Column('lease_id', sa.UUID, nullable=True),
    sa.Column('lease_until', sa.DateTime(timezone=True), nullable=True),
    sa.UniqueConstraint('user_id', 'operation_id', name='uq_generation_job_operation'),
    sa.CheckConstraint(
        sa.column('completed_specs').between(0, 16), name='ck_jobs_completed_specs'
    ),
    sa.CheckConstraint(sa.column('total_specs').between(0, 16), name='ck_jobs_total_specs'),
)


@postgres.session
async def create(session, user_id: uuid.UUID, data: dict) -> dict:
    async with session.transaction():
        row = await session.fetch_one(
            pg.insert(GenerationJobs)
            .values(user_id=user_id, **data)
            .on_conflict_do_nothing(constraint='uq_generation_job_operation')
            .returning(GenerationJobs)
        )
        if row is None:
            row = await session.fetch_one(
                GenerationJobs.select().where(
                    GenerationJobs.c.user_id == user_id,
                    GenerationJobs.c.operation_id == data['operation_id'],
                )
            )
            if any(row[key] != data[key] for key in ['input_revision', 'execution_mode']):
                raise models.ProposalConflict
        return row


@postgres.session
async def get(session, user_id: uuid.UUID, job_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        GenerationJobs.select().where(
            GenerationJobs.c.id == job_id, GenerationJobs.c.user_id == user_id
        )
    )
    if row is None:
        raise JobNotFound
    return row


@postgres.session
async def claim(session, lease_seconds: int) -> dict:
    now = datetime.datetime.now(datetime.UTC)
    async with session.transaction():
        await session.execute(
            GenerationJobs.update()
            .where(GenerationJobs.c.status == 'running', GenerationJobs.c.lease_until < now)
            .values(
                status='interrupted', error_category='interrupted', updated_at=sa.func.now()
            )
        )
        candidate = (
            sa.select(GenerationJobs.c.id)
            .where(GenerationJobs.c.status == 'queued')
            .order_by(GenerationJobs.c.created_at, GenerationJobs.c.id)
            .limit(1)
            .scalar_subquery()
        )
        row = await session.fetch_one(
            GenerationJobs.update()
            .where(GenerationJobs.c.id == candidate, GenerationJobs.c.status == 'queued')
            .values(
                status='running',
                lease_id=uuid.uuid4(),
                lease_until=now + datetime.timedelta(seconds=lease_seconds),
                updated_at=sa.func.now(),
            )
            .returning(GenerationJobs)
        )
        return row or {}


@postgres.session
async def update(session, job_id: uuid.UUID, lease_id: uuid.UUID, data: dict) -> dict:
    async with session.transaction():
        row = await session.fetch_one(
            GenerationJobs.update()
            .where(
                GenerationJobs.c.id == job_id,
                GenerationJobs.c.lease_id == lease_id,
                GenerationJobs.c.status == 'running',
                GenerationJobs.c.lease_until > datetime.datetime.now(datetime.UTC),
            )
            .values(**data, updated_at=sa.func.now())
            .returning(GenerationJobs)
        )
        if row is None:
            raise JobCancelled
        return row


@postgres.session
async def cancel(session, user_id: uuid.UUID, job_id: uuid.UUID) -> dict:
    async with session.transaction():
        row = await session.fetch_one(
            GenerationJobs.update()
            .where(
                GenerationJobs.c.id == job_id,
                GenerationJobs.c.user_id == user_id,
                GenerationJobs.c.status.in_(['queued', 'running']),
            )
            .values(status='cancelled', updated_at=sa.func.now())
            .returning(GenerationJobs)
        )
        return row or await get(session, user_id, job_id)
