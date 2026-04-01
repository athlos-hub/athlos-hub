"""add team logo_url

Revision ID: 20260402_team_logo
Revises: a7b8ed96e59e
Create Date: 2026-04-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260402_team_logo"
down_revision: Union[str, None] = "a7b8ed96e59e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "teams",
        sa.Column("logo_url", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("teams", "logo_url")
