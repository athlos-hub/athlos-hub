"""add_action_taken_to_notifications

Revision ID: b1f3b6f7c2a1
Revises: 768c910f4d59
Create Date: 2026-04-01 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b1f3b6f7c2a1"
down_revision: Union[str, None] = "768c910f4d59"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column("action_taken", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notifications", "action_taken")

