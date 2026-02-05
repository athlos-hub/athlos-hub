"""add_stats_types_fields

Revision ID: a29d2ae226c8
Revises: 57d61f7e0186
Create Date: 2026-02-03 15:33:44.595958

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a29d2ae226c8'
down_revision: Union[str, Sequence[str], None] = '57d61f7e0186'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Adicionar novos campos à tabela stats_types
    op.add_column('stats_types', sa.Column('description', sa.String(length=500), nullable=True))
    op.add_column('stats_types', sa.Column('icon', sa.String(length=50), nullable=True))
    op.add_column('stats_types', sa.Column('display_order', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remover os campos adicionados
    op.drop_column('stats_types', 'display_order')
    op.drop_column('stats_types', 'icon')
    op.drop_column('stats_types', 'description')
