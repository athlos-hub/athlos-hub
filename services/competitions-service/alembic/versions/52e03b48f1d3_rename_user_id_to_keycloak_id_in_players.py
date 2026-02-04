"""rename_user_id_to_keycloak_id_in_players

Revision ID: 52e03b48f1d3
Revises: 80fbb7da3768
Create Date: 2026-02-04 00:34:05.605587

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '52e03b48f1d3'
down_revision: Union[str, Sequence[str], None] = '80fbb7da3768'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Renomear a coluna user_id para keycloak_id (preserva os dados)
    op.alter_column('players', 'user_id', new_column_name='keycloak_id')


def downgrade() -> None:
    """Downgrade schema."""
    # Reverter: renomear keycloak_id de volta para user_id
    op.alter_column('players', 'keycloak_id', new_column_name='user_id')
