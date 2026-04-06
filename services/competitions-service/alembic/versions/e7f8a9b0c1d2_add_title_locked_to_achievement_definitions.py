"""add title_locked to competition_achievement_definitions

Revision ID: e7f8a9b0c1d2
Revises: c4f2197d8b31
Create Date: 2026-04-06 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, None] = "c4f2197d8b31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "competition_achievement_definitions",
        sa.Column(
            "title_locked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("competition_achievement_definitions", "title_locked")
