"""Revision-serialized schedule changes, with bounded conflict queries."""

import datetime
import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from ...core import postgres
from .. import models


class ScheduleConflict(Exception):
    pass


SchedulePreferences = sa.Table(
    'schedule_preferences',
    postgres.metadata,
    sa.Column(
        'user_id', sa.UUID, sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True
    ),
    sa.Column('timezone', sa.Text, nullable=False),
    sa.Column('duration_minutes', sa.Integer, nullable=False),
    sa.Column('availability', pg.JSONB, nullable=False),
    sa.Column('revision', sa.Integer, nullable=False, server_default='0'),
    sa.CheckConstraint(
        sa.column('duration_minutes').between(5, 120), name='ck_schedule_duration'
    ),
    sa.CheckConstraint(sa.column('revision') >= 0, name='ck_schedule_revision'),
)
ScheduleAppointments = sa.Table(
    'schedule_appointments',
    postgres.metadata,
    *models.ai_coach.identity_columns(),
    sa.Column(
        'plan_id',
        sa.UUID,
        sa.ForeignKey('training_plans.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    ),
    sa.Column('title', sa.Text, nullable=False),
    sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('ends_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column(
        'status',
        pg.ENUM(
            'planned',
            'completed',
            'skipped',
            'cancelled',
            name='schedule_appointments_status_enum',
        ),
        nullable=False,
        server_default='planned',
    ),
    sa.Column(
        'sync_status',
        pg.ENUM('local', 'pending', 'synced', 'error', name='schedule_appointments_sync_enum'),
        nullable=False,
        server_default='local',
    ),
    sa.CheckConstraint(
        sa.column('ends_at') > sa.column('starts_at'), name='ck_schedule_time_order'
    ),
    sa.CheckConstraint(
        sa.func.length(sa.column('title')).between(1, 120), name='ck_schedule_title'
    ),
)


@postgres.session
async def preferences_get(session, user_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        SchedulePreferences.select().where(SchedulePreferences.c.user_id == user_id)
    )
    return row or {
        'timezone': 'Asia/Almaty',
        'duration_minutes': 20,
        'availability': [
            {'weekday': day, 'start_minute': 1080, 'end_minute': 1260} for day in [0, 2, 4]
        ],
        'revision': 0,
    }


@postgres.session
async def preferences_replace(
    session, user_id: uuid.UUID, data: dict, expected_revision: int
) -> dict:
    async with session.transaction():
        stmt = pg.insert(SchedulePreferences).values(user_id=user_id, **data, revision=1)
        if expected_revision == 0:
            row = await session.fetch_one(
                stmt.on_conflict_do_nothing(index_elements=['user_id']).returning(
                    SchedulePreferences
                )
            )
        else:
            row = await session.fetch_one(
                SchedulePreferences.update()
                .where(
                    SchedulePreferences.c.user_id == user_id,
                    SchedulePreferences.c.revision == expected_revision,
                )
                .values(**data, revision=expected_revision + 1)
                .returning(SchedulePreferences)
            )
        if row is None:
            raise ScheduleConflict
        return row


@postgres.session
async def appointment_get(session, user_id: uuid.UUID, appointment_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        ScheduleAppointments.select().where(
            ScheduleAppointments.c.id == appointment_id,
            ScheduleAppointments.c.user_id == user_id,
        )
    )
    if row is None:
        raise models.CoachNotFound
    return row


@postgres.session
async def appointments_list(
    session, user_id: uuid.UUID, start: datetime.datetime, end: datetime.datetime
) -> list[dict]:
    return await session.fetch_all(
        ScheduleAppointments.select()
        .where(
            ScheduleAppointments.c.user_id == user_id,
            ScheduleAppointments.c.starts_at < end,
            ScheduleAppointments.c.ends_at > start,
        )
        .order_by(ScheduleAppointments.c.starts_at)
        .limit(200)
    )


@postgres.session
async def proposal_apply(
    session, user_id: uuid.UUID, data: dict, revision: int, now: datetime.datetime
) -> dict:
    # Called in the proposal transaction. CAS acquires the ordinary update lock;
    # a second contender cannot pass the same revision. No explicit locks.
    prefs = await preferences_get(session, user_id)
    if revision == 0:
        inserted = await session.fetch_one(
            pg.insert(SchedulePreferences)
            .values(
                user_id=user_id,
                timezone=prefs['timezone'],
                duration_minutes=prefs['duration_minutes'],
                availability=prefs['availability'],
                revision=1,
            )
            .on_conflict_do_nothing(index_elements=['user_id'])
            .returning(SchedulePreferences)
        )
    else:
        inserted = await session.fetch_one(
            SchedulePreferences.update()
            .where(
                SchedulePreferences.c.user_id == user_id,
                SchedulePreferences.c.revision == revision,
            )
            .values(revision=revision + 1)
            .returning(SchedulePreferences)
        )
    if inserted is None:
        raise ScheduleConflict
    appointment_id = uuid.UUID(data['appointment_id']) if data['appointment_id'] else None
    if data['action'] in {'create', 'move'}:
        start = datetime.datetime.fromisoformat(data['starts_at'])
        end = start + datetime.timedelta(minutes=data['duration_minutes'])
        if start <= now:
            raise ScheduleConflict
        overlaps = await session.fetch_one(
            ScheduleAppointments.select()
            .where(
                ScheduleAppointments.c.user_id == user_id,
                ScheduleAppointments.c.status == 'planned',
                ScheduleAppointments.c.starts_at < end,
                ScheduleAppointments.c.ends_at > start,
                ScheduleAppointments.c.id != appointment_id if appointment_id else sa.true(),
            )
            .limit(1)
        )
        if overlaps:
            raise ScheduleConflict
        plan_id = uuid.UUID(data['plan_id']) if data['plan_id'] else None
        if plan_id:
            await models.training_plans.plan_get(session, user_id, plan_id)
        values = {
            'starts_at': start,
            'ends_at': end,
            'title': data['title'],
            'plan_id': plan_id,
            'sync_status': 'pending',
        }
        if data['action'] == 'create':
            row = await session.fetch_one(
                ScheduleAppointments.insert()
                .values(user_id=user_id, **values)
                .returning(ScheduleAppointments)
            )
        else:
            row = await session.fetch_one(
                ScheduleAppointments.update()
                .where(
                    ScheduleAppointments.c.user_id == user_id,
                    ScheduleAppointments.c.id == appointment_id,
                    ScheduleAppointments.c.status == 'planned',
                )
                .values(**values)
                .returning(ScheduleAppointments)
            )
    else:
        row = await session.fetch_one(
            ScheduleAppointments.update()
            .where(
                ScheduleAppointments.c.user_id == user_id,
                ScheduleAppointments.c.id == appointment_id,
                ScheduleAppointments.c.status == 'planned',
                ScheduleAppointments.c.starts_at <= now
                if data['action'] == 'complete'
                else sa.true(),
            )
            .values(
                status={'cancel': 'cancelled', 'skip': 'skipped', 'complete': 'completed'}[
                    data['action']
                ],
                sync_status='pending',
            )
            .returning(ScheduleAppointments)
        )
    if row is None:
        raise ScheduleConflict
    return {
        'appointment_id': str(row['id']),
        'revision': revision + 1,
        'saved': True,
        'sync_status': row['sync_status'],
    }
