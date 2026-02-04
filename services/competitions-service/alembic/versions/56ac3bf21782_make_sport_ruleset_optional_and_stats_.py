"""make_sport_ruleset_optional_and_stats_reusable

Revision ID: 56ac3bf21782
Revises: 87c5c1a7b046
Create Date: 2026-02-04 19:42:22.592119

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '56ac3bf21782'
down_revision: Union[str, Sequence[str], None] = '87c5c1a7b046'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Tornar sport_ruleset_id nullable na tabela competitions
    op.alter_column('competitions', 'sport_ruleset_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)
    
    # 2. Remover unique constraint de competition_id na tabela stats_rulesets
    op.drop_constraint('stats_rulesets_competition_id_key', 'stats_rulesets', type_='unique')
    
    # 3. Tornar competition_id nullable na tabela stats_rulesets
    op.alter_column('stats_rulesets', 'competition_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Tornar competition_id NOT NULL na tabela stats_rulesets
    # AVISO: Isso falhará se houver registros com competition_id NULL
    op.alter_column('stats_rulesets', 'competition_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
    
    # 2. Recriar unique constraint em competition_id
    op.create_unique_constraint('stats_rulesets_competition_id_key', 'stats_rulesets', ['competition_id'])
    
    # 3. Tornar sport_ruleset_id NOT NULL na tabela competitions
    # AVISO: Isso falhará se houver registros com sport_ruleset_id NULL
    op.alter_column('competitions', 'sport_ruleset_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
