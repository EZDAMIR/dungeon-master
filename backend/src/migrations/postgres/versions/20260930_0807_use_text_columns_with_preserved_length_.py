"""use text columns with preserved length bounds

Revision ID: d14a8a94311f
Revises: e2dc2dbe10a5
Create Date: 2026-09-30 08:07:52.927859+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'd14a8a94311f'
down_revision: str | None = 'e2dc2dbe10a5'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        'exercises',
        'key',
        existing_type=sa.VARCHAR(length=80),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        'exercises',
        'name',
        existing_type=sa.VARCHAR(length=100),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        'health_constraints',
        'note',
        existing_type=sa.VARCHAR(length=500),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        'profiles',
        'locale',
        existing_type=sa.VARCHAR(length=35),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        'profiles',
        'timezone',
        existing_type=sa.VARCHAR(length=100),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        'training_plan_items',
        'tempo_hint',
        existing_type=sa.VARCHAR(length=80),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        'training_plans',
        'rationale',
        existing_type=sa.VARCHAR(length=500),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        'training_plans',
        'generator_version',
        existing_type=sa.VARCHAR(length=50),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        'users',
        'email',
        existing_type=sa.VARCHAR(length=254),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        'users',
        'display_name',
        existing_type=sa.VARCHAR(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        'workout_sessions',
        'client_engine_version',
        existing_type=sa.VARCHAR(length=50),
        type_=sa.Text(),
        existing_nullable=False,
    )

    # Alembic does not autogenerate CHECK additions; these match model metadata.
    op.create_check_constraint(
        'ck_exercises_key_length',
        'exercises',
        sa.func.length(sa.column('key')) <= 80,
    )
    op.create_check_constraint(
        'ck_exercises_name_length',
        'exercises',
        sa.func.length(sa.column('name')) <= 100,
    )
    op.create_check_constraint(
        'ck_health_constraints_note_length',
        'health_constraints',
        sa.func.length(sa.column('note')) <= 500,
    )
    op.create_check_constraint(
        'ck_profiles_locale_length',
        'profiles',
        sa.func.length(sa.column('locale')) <= 35,
    )
    op.create_check_constraint(
        'ck_profiles_timezone_length',
        'profiles',
        sa.func.length(sa.column('timezone')) <= 100,
    )
    op.create_check_constraint(
        'ck_training_plan_items_tempo_hint_length',
        'training_plan_items',
        sa.func.length(sa.column('tempo_hint')) <= 80,
    )
    op.create_check_constraint(
        'ck_training_plans_rationale_length',
        'training_plans',
        sa.func.length(sa.column('rationale')) <= 500,
    )
    op.create_check_constraint(
        'ck_training_plans_generator_version_length',
        'training_plans',
        sa.func.length(sa.column('generator_version')) <= 50,
    )
    op.create_check_constraint(
        'ck_users_email_length',
        'users',
        sa.func.length(sa.column('email')) <= 254,
    )
    op.create_check_constraint(
        'ck_users_display_name_length',
        'users',
        sa.func.length(sa.column('display_name')) <= 100,
    )
    op.create_check_constraint(
        'ck_workout_sessions_client_engine_version_length',
        'workout_sessions',
        sa.func.length(sa.column('client_engine_version')) <= 50,
    )


def downgrade() -> None:
    pass
