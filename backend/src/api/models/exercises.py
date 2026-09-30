import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from ...core import postgres

Exercises = sa.Table(
    'exercises',
    postgres.metadata,
    sa.Column('id', sa.UUID, primary_key=True, default=uuid.uuid4),
    sa.Column('key', sa.String(80), nullable=False),
    sa.Column('name', sa.String(100), nullable=False),
    sa.Column(
        'difficulty',
        pg.ENUM('beginner', 'intermediate', 'advanced', name='exercises_difficulty_enum'),
        nullable=False,
    ),
    sa.Column('equipment_codes', pg.JSONB, nullable=False),
    sa.Column(
        'impact_level',
        pg.ENUM('low', 'medium', 'high', name='exercises_impact_enum'),
        nullable=False,
    ),
    sa.Column(
        'camera_angle',
        pg.ENUM('side', 'front', 'none', name='exercises_camera_angle_enum'),
        nullable=False,
    ),
    sa.Column('contraindication_tags', pg.JSONB, nullable=False),
    sa.Column('analysis_profile', pg.JSONB, nullable=False),
    sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.true()),
    sa.Column(
        'created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
    ),
    sa.Column(
        'updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
    ),
    sa.UniqueConstraint('key', name='uq_exercises_key'),
)


@postgres.session
async def exercise_list(session) -> list[dict]:
    return await session.fetch_all(
        Exercises.select().where(Exercises.c.is_active.is_(True)).order_by(Exercises.c.key)
    )
