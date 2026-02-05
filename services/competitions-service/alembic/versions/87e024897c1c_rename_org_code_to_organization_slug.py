"""rename_org_code_to_organization_slug

Revision ID: 87e024897c1c
Revises: c3b7e68d2bce
Create Date: 2026-02-02 23:04:13.471610

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '87e024897c1c'
down_revision: Union[str, Sequence[str], None] = 'c3b7e68d2bce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Renomear coluna org_code para organization_slug na tabela modalities
    op.alter_column('modalities', 'org_code', 
                    new_column_name='organization_slug',
                    existing_type=sa.String(),
                    existing_nullable=False)
    
    # Alterar tipo da coluna para String(255) para suportar slugs maiores
    op.alter_column('modalities', 'organization_slug',
                    type_=sa.String(255),
                    existing_nullable=False)
    
    # Renomear coluna org_code para organization_slug na tabela teams
    op.alter_column('teams', 'org_code',
                    new_column_name='organization_slug',
                    existing_type=sa.String(50),
                    existing_nullable=False)
    
    # Alterar tipo da coluna para String(255) para suportar slugs maiores
    op.alter_column('teams', 'organization_slug',
                    type_=sa.String(255),
                    existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Reverter alterações na tabela teams
    op.alter_column('teams', 'organization_slug',
                    type_=sa.String(50),
                    existing_nullable=False)
    
    op.alter_column('teams', 'organization_slug',
                    new_column_name='org_code',
                    existing_type=sa.String(50),
                    existing_nullable=False)
    
    # Reverter alterações na tabela modalities
    op.alter_column('modalities', 'organization_slug',
                    type_=sa.String(),
                    existing_nullable=False)
    
    op.alter_column('modalities', 'organization_slug',
                    new_column_name='org_code',
                    existing_type=sa.String(),
                    existing_nullable=False)
