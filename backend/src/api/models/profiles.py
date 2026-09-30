import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from ...core import postgres


class ProfileDoesNotExist(Exception):
    pass


Profiles = sa.Table(
    'profiles',
    postgres.metadata,
    sa.Column(
        'user_id',
        sa.UUID,
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True,
    ),
    sa.Column(
        'goal',
        pg.ENUM(
            'general_fitness',
            'strength_foundation',
            'mobility',
            name='profiles_goal_enum',
        ),
        nullable=False,
    ),
    sa.Column(
        'experience_level',
        pg.ENUM('beginner', 'intermediate', 'advanced', name='profiles_experience_enum'),
        nullable=False,
    ),
    sa.Column('days_per_week', sa.SmallInteger, nullable=False),
    sa.Column('session_minutes', sa.SmallInteger, nullable=False),
    sa.Column('equipment', pg.JSONB, nullable=False),
    sa.Column('locale', sa.Text, nullable=False),
    sa.Column('timezone', sa.Text, nullable=False),
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
    sa.CheckConstraint(sa.column('days_per_week').between(1, 7), name='ck_profiles_days'),
    sa.CheckConstraint(
        sa.column('session_minutes').between(5, 120),
        name='ck_profiles_minutes',
    ),
    sa.CheckConstraint(
        sa.func.length(sa.column('locale')) <= 35,
        name='ck_profiles_locale_length',
    ),
    sa.CheckConstraint(
        sa.func.length(sa.column('timezone')) <= 100,
        name='ck_profiles_timezone_length',
    ),
)
HealthConstraints = sa.Table(
    'health_constraints',
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
        'code',
        pg.ENUM(
            'no_high_impact',
            'avoid_deep_knee_flexion',
            'avoid_overhead',
            name='health_constraints_code_enum',
        ),
        nullable=False,
    ),
    sa.Column(
        'source',
        pg.ENUM('self_reported', 'document_extracted', name='health_constraints_source_enum'),
        nullable=False,
    ),
    sa.Column(
        'status',
        pg.ENUM(
            'pending_confirmation',
            'confirmed',
            'rejected',
            name='health_constraints_status_enum',
        ),
        nullable=False,
    ),
    sa.Column('note', sa.Text, nullable=True),
    sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint(
        sa.func.length(sa.column('note')) <= 500,
        name='ck_health_constraints_note_length',
    ),
)


@postgres.session
async def profile_get(session, user_id: uuid.UUID) -> dict:
    profile = await session.fetch_one(Profiles.select().where(Profiles.c.user_id == user_id))
    if profile is None:
        raise ProfileDoesNotExist
    constraints = await session.fetch_all(
        sa.select(HealthConstraints.c.code)
        .where(
            HealthConstraints.c.user_id == user_id,
            HealthConstraints.c.status == 'confirmed',
        )
        .order_by(HealthConstraints.c.code),
    )
    profile['confirmed_constraints'] = [row['code'] for row in constraints]
    return profile


@postgres.session
async def profile_replace(
    session,
    user_id: uuid.UUID,
    data: dict,
    constraints: list[str],
) -> dict:
    async with session.transaction():
        statement = pg.insert(Profiles).values(**data, user_id=user_id)
        await session.execute(
            statement.on_conflict_do_update(
                index_elements=[Profiles.c.user_id],
                set_={**data, 'updated_at': sa.func.now()},
            ),
        )
        await session.execute(
            HealthConstraints.delete().where(HealthConstraints.c.user_id == user_id),
        )
        if constraints:
            await session.execute(
                HealthConstraints.insert().values(
                    [
                        {
                            'user_id': user_id,
                            'code': code,
                            'source': 'self_reported',
                            'status': 'confirmed',
                            'confirmed_at': sa.func.now(),
                        }
                        for code in constraints
                    ],
                ),
            )
        return await profile_get(session, user_id)
