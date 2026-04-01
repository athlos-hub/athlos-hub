"""add logo_url to teams

Revision ID: 8a2b3c4d5e6f
Revises: 7f3a1b2c4d5e
Create Date: 2026-04-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8a2b3c4d5e6f"
down_revision: Union[str, Sequence[str], None] = "7f3a1b2c4d5e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "teams",
        sa.Column("logo_url", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("teams", "logo_url")
