"""add auth_team_id to teams

Revision ID: 9b3c4d5e6f7a
Revises: 8a2b3c4d5e6f
Create Date: 2026-04-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9b3c4d5e6f7a"
down_revision: Union[str, Sequence[str], None] = "8a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "teams",
        sa.Column("auth_team_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        "ix_teams_auth_team_id",
        "teams",
        ["auth_team_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_teams_auth_team_id", table_name="teams")
    op.drop_column("teams", "auth_team_id")
