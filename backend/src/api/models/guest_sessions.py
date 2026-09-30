"""Opaque guest recovery credentials; hashes only, atomic rotation and revocation."""

import datetime
import uuid

import sqlalchemy as sa

from ...core import postgres


class RefreshInvalid(Exception):
    pass


GuestSessions = sa.Table(
    'guest_sessions',
    postgres.metadata,
    sa.Column('id', sa.UUID, primary_key=True, default=uuid.uuid4),
    sa.Column(
        'user_id',
        sa.UUID,
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    ),
    sa.Column('secret_hash', sa.Text, nullable=False, unique=True),
    sa.Column('previous_hash', sa.Text, nullable=True),
    sa.Column('previous_until', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column(
        'created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
    ),
)


@postgres.session
async def create(
    session, user_id: uuid.UUID, secret_hash: str, expires_at: datetime.datetime
) -> dict:
    async with session.transaction():
        return await session.fetch_one(
            GuestSessions.insert()
            .values(user_id=user_id, secret_hash=secret_hash, expires_at=expires_at)
            .returning(GuestSessions)
        )


@postgres.session
async def rotate(session, secret_hash: str, next_hash: str, now: datetime.datetime) -> dict:
    async with session.transaction():
        row = await session.fetch_one(
            GuestSessions.update()
            .where(
                GuestSessions.c.secret_hash == secret_hash,
                GuestSessions.c.revoked_at.is_(None),
                GuestSessions.c.expires_at > now,
            )
            .values(
                secret_hash=next_hash,
                previous_hash=secret_hash,
                previous_until=now + datetime.timedelta(seconds=20),
            )
            .returning(GuestSessions)
        )
        if row is None:
            row = await session.fetch_one(
                GuestSessions.select().where(
                    GuestSessions.c.previous_hash == secret_hash,
                    GuestSessions.c.secret_hash == next_hash,
                    GuestSessions.c.previous_until > now,
                    GuestSessions.c.revoked_at.is_(None),
                    GuestSessions.c.expires_at > now,
                )
            )
        if row is None:
            raise RefreshInvalid
        return row


@postgres.session
async def revoke(session, secret_hash: str) -> dict:
    async with session.transaction():
        await session.execute(
            GuestSessions.update()
            .where(
                sa.or_(
                    GuestSessions.c.secret_hash == secret_hash,
                    GuestSessions.c.previous_hash == secret_hash,
                )
            )
            .values(revoked_at=sa.func.now())
        )
    return {'revoked': True}
