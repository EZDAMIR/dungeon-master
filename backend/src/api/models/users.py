import uuid

import sqlalchemy as sa

from ...core import postgres


class UserDoesNotExist(Exception):
    pass


Users = sa.Table(
    'users',
    postgres.metadata,
    sa.Column('id', sa.UUID, primary_key=True, default=uuid.uuid4),
    sa.Column('email', sa.String(254), nullable=True),
    sa.Column('display_name', sa.String(100), nullable=True),
    sa.Column('is_guest', sa.Boolean, nullable=False, server_default=sa.true()),
    sa.Column(
        'created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
    ),
    sa.Column(
        'updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
    ),
    sa.UniqueConstraint('email', name='uq_users_email'),
)


@postgres.session
async def user_create(session, data: dict) -> dict:
    async with session.transaction():
        return await session.fetch_one(Users.insert().values(**data).returning(Users))


@postgres.session
async def user_get(session, user_id: uuid.UUID) -> dict:
    row = await session.fetch_one(Users.select().where(Users.c.id == user_id))
    if row is None:
        raise UserDoesNotExist
    return row
