"""add organization_slug to sport_rulesets

Revision ID: 7f3a1b2c4d5e
Revises: 6eb32e7e5fd0
Create Date: 2026-03-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7f3a1b2c4d5e"
down_revision: Union[str, Sequence[str], None] = "6eb32e7e5fd0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sport_rulesets",
        sa.Column("organization_slug", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "ix_sport_rulesets_organization_slug",
        "sport_rulesets",
        ["organization_slug"],
        unique=False,
    )

    # Vincula cada ruleset já usado em competição à organização da modalidade (primeira competição por data).
    op.execute(
        """
        UPDATE sport_rulesets sr
        SET organization_slug = x.org_slug
        FROM (
            SELECT DISTINCT ON (c.sport_ruleset_id)
                c.sport_ruleset_id AS sid,
                m.organization_slug AS org_slug
            FROM competitions c
            INNER JOIN modalities m ON c.modality_id = m.id
            WHERE c.sport_ruleset_id IS NOT NULL
            ORDER BY c.sport_ruleset_id, c.start_date ASC NULLS LAST
        ) x
        WHERE sr.id = x.sid AND sr.organization_slug IS NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_sport_rulesets_organization_slug", table_name="sport_rulesets")
    op.drop_column("sport_rulesets", "organization_slug")
