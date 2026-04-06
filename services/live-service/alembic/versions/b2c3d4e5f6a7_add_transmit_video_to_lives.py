"""add transmit_video to Live

Revision ID: b2c3d4e5f6a7
Revises: 303d6a64ca9e
Create Date: 2026-04-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "303d6a64ca9e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "Live",
        sa.Column(
            "transmit_video",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("Live", "transmit_video")
