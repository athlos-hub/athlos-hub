"""add target type to competition achievements

Revision ID: f19c2a7d4e11
Revises: e7f8a9b0c1d2
Create Date: 2026-04-06 00:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f19c2a7d4e11"
down_revision: Union[str, None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "competition_achievement_definitions",
        sa.Column("target_type", sa.String(length=16), nullable=False, server_default="PLAYER"),
    )

    op.add_column(
        "competition_achievement_awards",
        sa.Column("target_type", sa.String(length=16), nullable=False, server_default="PLAYER"),
    )
    op.add_column(
        "competition_achievement_awards",
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_competition_achievement_awards_team_id",
        "competition_achievement_awards",
        "teams",
        ["team_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.alter_column(
        "competition_achievement_awards",
        "player_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    op.alter_column(
        "competition_achievement_awards",
        "player_keycloak_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )

    op.drop_constraint(
        "uq_competition_achievement_award_comp_def_player",
        "competition_achievement_awards",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_competition_achievement_award_comp_def_player",
        "competition_achievement_awards",
        ["competition_id", "definition_id", "target_type", "player_id", "team_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_competition_achievement_award_comp_def_player",
        "competition_achievement_awards",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_competition_achievement_award_comp_def_player",
        "competition_achievement_awards",
        ["competition_id", "definition_id", "player_id"],
    )

    op.alter_column(
        "competition_achievement_awards",
        "player_keycloak_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.alter_column(
        "competition_achievement_awards",
        "player_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    op.drop_constraint(
        "fk_competition_achievement_awards_team_id",
        "competition_achievement_awards",
        type_="foreignkey",
    )
    op.drop_column("competition_achievement_awards", "team_id")
    op.drop_column("competition_achievement_awards", "target_type")
    op.drop_column("competition_achievement_definitions", "target_type")
