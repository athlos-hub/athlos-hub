"""Remove novu_notification_id from notifications

Revision ID: c91e2f4a8b01
Revises: b4d8abcd7df6
Create Date: 2025-03-24

"""
import os
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c91e2f4a8b01"
down_revision: Union[str, None] = "b4d8abcd7df6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _schema_kw():
    s = os.getenv("NOTIFICATIONS_DATABASE_SCHEMA", "").strip()
    return {"schema": s} if s else {}


def upgrade() -> None:
    op.drop_column("notifications", "novu_notification_id", **_schema_kw())


def downgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column("novu_notification_id", sa.String(length=255), nullable=True),
        **_schema_kw(),
    )
