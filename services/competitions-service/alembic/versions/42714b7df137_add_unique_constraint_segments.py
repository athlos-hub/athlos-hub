"""add_unique_constraint_segments

Revision ID: 42714b7df137
Revises: a29d2ae226c8
Create Date: 2026-02-03 15:58:04.180226

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '42714b7df137'
down_revision: Union[str, Sequence[str], None] = 'a29d2ae226c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove segments duplicados mantendo apenas o primeiro de cada grupo
    op.execute("""
        DELETE FROM segments
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM segments
            GROUP BY match_id, segment_number
        );
    """)
    
    # Adiciona constraint único
    op.create_unique_constraint('uq_match_segment', 'segments', ['match_id', 'segment_number'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_match_segment', 'segments', type_='unique')
