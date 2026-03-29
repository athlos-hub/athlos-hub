"""Initial schema for live-service.

Revision ID: 001_initial
Revises:
Create Date: 2026-03-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "Live",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("external_match_id", sa.String(), nullable=False),
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("stream_key", sa.String(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("external_match_id"),
    )
    op.create_index("Live_organization_id_idx", "Live", ["organization_id"])

    op.create_table(
        "GoogleCalendarToken",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("tokens", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "LiveEvent",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("live_id", sa.String(length=36), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["live_id"], ["Live.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("LiveEvent_live_id_idx", "LiveEvent", ["live_id"])
    op.create_index(
        "LiveEvent_live_id_created_at_idx", "LiveEvent", ["live_id", "created_at"]
    )

    op.create_table(
        "GoogleCalendarEvent",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("live_id", sa.String(length=36), nullable=False),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("html_link", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["live_id"], ["Live.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["GoogleCalendarToken.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "live_id", name="GoogleCalendarEvent_user_id_live_id_key"),
    )
    op.create_index("GoogleCalendarEvent_user_id_idx", "GoogleCalendarEvent", ["user_id"])
    op.create_index("GoogleCalendarEvent_live_id_idx", "GoogleCalendarEvent", ["live_id"])


def downgrade() -> None:
    op.drop_table("GoogleCalendarEvent")
    op.drop_table("LiveEvent")
    op.drop_table("GoogleCalendarToken")
    op.drop_table("Live")
