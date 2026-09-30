"""One-time OAuth state, encrypted connections and app-created event mapping."""

import datetime
import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from ...core import postgres
from .. import models


class CalendarStateInvalid(Exception):
    pass


CalendarStates = sa.Table(
    'calendar_oauth_states',
    postgres.metadata,
    *models.ai_coach.identity_columns(),
    sa.Column('state_hash', sa.Text, nullable=False, unique=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('consumed_at', sa.DateTime(timezone=True), nullable=True),
)
CalendarConnections = sa.Table(
    'calendar_connections',
    postgres.metadata,
    sa.Column(
        'user_id', sa.UUID, sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True
    ),
    sa.Column('tokens_encrypted', sa.Text, nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column(
        'status',
        pg.ENUM('connected', 'revoked', 'error', name='calendar_connections_status_enum'),
        nullable=False,
        server_default='connected',
    ),
)
CalendarEventLinks = sa.Table(
    'calendar_event_links',
    postgres.metadata,
    sa.Column(
        'appointment_id',
        sa.UUID,
        sa.ForeignKey('schedule_appointments.id', ondelete='CASCADE'),
        primary_key=True,
    ),
    sa.Column(
        'user_id',
        sa.UUID,
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    ),
    sa.Column('calendar_id', sa.Text, nullable=False, server_default='primary'),
    sa.Column('event_id', sa.Text, nullable=False),
    sa.Column('etag', sa.Text, nullable=True),
)
CalendarSyncRuns = sa.Table(
    'calendar_sync_runs',
    postgres.metadata,
    *models.ai_coach.identity_columns(),
    sa.Column('operation_id', sa.UUID, nullable=False),
    sa.Column('result', pg.JSONB, nullable=False),
    sa.UniqueConstraint('user_id', 'operation_id', name='uq_calendar_sync_operation'),
)


@postgres.session
async def state_create(
    session, user_id: uuid.UUID, state_hash: str, expiry: datetime.datetime
) -> dict:
    async with session.transaction():
        return await session.fetch_one(
            CalendarStates.insert()
            .values(user_id=user_id, state_hash=state_hash, expires_at=expiry)
            .returning(CalendarStates)
        )


@postgres.session
async def state_consume(session, state_hash: str, now: datetime.datetime) -> dict:
    async with session.transaction():
        row = await session.fetch_one(
            CalendarStates.update()
            .where(
                CalendarStates.c.state_hash == state_hash,
                CalendarStates.c.expires_at > now,
                CalendarStates.c.consumed_at.is_(None),
            )
            .values(consumed_at=now)
            .returning(CalendarStates)
        )
        if row is None:
            raise CalendarStateInvalid
        return row


@postgres.session
async def connection_get(session, user_id: uuid.UUID) -> dict:
    return (
        await session.fetch_one(
            CalendarConnections.select().where(CalendarConnections.c.user_id == user_id)
        )
        or {}
    )


@postgres.session
async def connection_save(session, user_id: uuid.UUID, data: dict) -> dict:
    async with session.transaction():
        stmt = pg.insert(CalendarConnections).values(user_id=user_id, **data)
        return await session.fetch_one(
            stmt.on_conflict_do_update(index_elements=['user_id'], set_=data).returning(
                CalendarConnections
            )
        )


@postgres.session
async def connection_status(session, user_id: uuid.UUID, status: str) -> None:
    async with session.transaction():
        await session.execute(
            CalendarConnections.update()
            .where(CalendarConnections.c.user_id == user_id)
            .values(status=status)
        )


@postgres.session
async def disconnect(session, user_id: uuid.UUID) -> dict:
    async with session.transaction():
        await session.execute(
            CalendarConnections.delete().where(CalendarConnections.c.user_id == user_id)
        )
    return {'connected': False}


@postgres.session
async def sync_candidates(session, user_id: uuid.UUID) -> list[dict]:
    return await session.fetch_all(
        models.schedule.ScheduleAppointments.select()
        .where(
            models.schedule.ScheduleAppointments.c.user_id == user_id,
            models.schedule.ScheduleAppointments.c.sync_status.in_(['pending', 'error']),
        )
        .limit(50)
    )


@postgres.session
async def link_get(session, user_id: uuid.UUID, appointment_id: uuid.UUID) -> dict:
    return (
        await session.fetch_one(
            CalendarEventLinks.select().where(
                CalendarEventLinks.c.user_id == user_id,
                CalendarEventLinks.c.appointment_id == appointment_id,
            )
        )
        or {}
    )


@postgres.session
async def sync_save(
    session, user_id: uuid.UUID, appointment: dict, result: dict | None
) -> dict:
    async with session.transaction():
        table = models.schedule.ScheduleAppointments
        row = await session.fetch_one(
            table.update()
            .where(
                table.c.user_id == user_id,
                table.c.id == appointment['id'],
                table.c.starts_at == appointment['starts_at'],
                table.c.ends_at == appointment['ends_at'],
                table.c.status == appointment['status'],
            )
            .values(sync_status='synced' if result else 'error')
            .returning(table)
        )
        if row is None:
            return {'stale': True}
        if result:
            stmt = pg.insert(CalendarEventLinks).values(
                user_id=user_id,
                appointment_id=appointment['id'],
                event_id=result['event_id'],
                etag=result.get('etag'),
            )
            await session.execute(
                stmt.on_conflict_do_update(
                    index_elements=['appointment_id'],
                    set_={'event_id': result['event_id'], 'etag': result.get('etag')},
                )
            )
        return {'stale': False}


@postgres.session
async def sync_run_get(session, user_id: uuid.UUID, operation_id: uuid.UUID) -> dict:
    row = await session.fetch_one(
        CalendarSyncRuns.select().where(
            CalendarSyncRuns.c.user_id == user_id,
            CalendarSyncRuns.c.operation_id == operation_id,
        )
    )
    return row['result'] if row else {}


@postgres.session
async def sync_run_save(
    session, user_id: uuid.UUID, operation_id: uuid.UUID, result: dict
) -> dict:
    async with session.transaction():
        await session.execute(
            pg.insert(CalendarSyncRuns)
            .values(user_id=user_id, operation_id=operation_id, result=result)
            .on_conflict_do_nothing(constraint='uq_calendar_sync_operation')
        )
        return await sync_run_get(session, user_id, operation_id)
