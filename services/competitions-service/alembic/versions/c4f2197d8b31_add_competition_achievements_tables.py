"""add competition achievements tables

Revision ID: c4f2197d8b31
Revises: a1b2c3d4e5f6
Create Date: 2026-04-06 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c4f2197d8b31"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "competition_achievement_definitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competition_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stat_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.String(length=400), nullable=True),
        sa.Column("top_n", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["stat_type_id"], ["stats_types.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "competition_id",
            "stat_type_id",
            name="uq_competition_achievement_definition_competition_stat_type",
        ),
    )

    op.create_table(
        "competition_achievement_awards",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competition_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("definition_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("player_keycloak_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rank_position", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("stat_value", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["definition_id"],
            ["competition_achievement_definitions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "competition_id",
            "definition_id",
            "player_id",
            name="uq_competition_achievement_award_comp_def_player",
        ),
    )


def downgrade() -> None:
    op.drop_table("competition_achievement_awards")
    op.drop_table("competition_achievement_definitions")
