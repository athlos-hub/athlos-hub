"""add_teams_tables

Revision ID: 20260204_teams
Revises: 7aa28378b8b7
Create Date: 2026-02-04 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260204_teams'
down_revision: Union[str, None] = '7aa28378b8b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Criar enum para status do time
    team_status = postgresql.ENUM(
        'PENDING', 'RECRUITING', 'READY', 'APPROVED', 'REJECTED',
        name='team_status',
        create_type=False
    )
    team_status.create(op.get_bind(), checkfirst=True)

    # Criar enum para status do convite de time
    team_invite_status = postgresql.ENUM(
        'PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED',
        name='team_invite_status',
        create_type=False
    )
    team_invite_status.create(op.get_bind(), checkfirst=True)

    # Criar tabela teams
    op.create_table(
        'teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('competition_id', sa.Integer(), nullable=False),
        sa.Column('competition_name', sa.String(255), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('abbreviation', sa.String(3), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'RECRUITING', 'READY', 'APPROVED', 'REJECTED', name='team_status'), nullable=False),
        sa.Column('min_members', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('max_members', sa.Integer(), nullable=False, server_default='20'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('external_team_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'competition_id', 'name', name='uq_team_org_competition_name')
    )
    op.create_index('ix_teams_organization_id', 'teams', ['organization_id'])
    op.create_index('ix_teams_competition_id', 'teams', ['competition_id'])

    # Criar tabela team_members
    op.create_table(
        'team_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_captain', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_id', 'user_id', name='uq_team_member')
    )
    op.create_index('ix_team_members_team_id', 'team_members', ['team_id'])
    op.create_index('ix_team_members_user_id', 'team_members', ['user_id'])

    # Criar tabela team_invites
    op.create_table(
        'team_invites',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('invite_token', sa.String(64), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED', name='team_invite_status'), nullable=False),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('use_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_team_invites_team_id', 'team_invites', ['team_id'])
    op.create_index('ix_team_invites_invite_token', 'team_invites', ['invite_token'], unique=True)
    op.create_index('ix_team_invites_token_status', 'team_invites', ['invite_token', 'status'])


def downgrade() -> None:
    op.drop_table('team_invites')
    op.drop_table('team_members')
    op.drop_table('teams')
    
    # Remover enums
    op.execute('DROP TYPE IF EXISTS team_invite_status')
    op.execute('DROP TYPE IF EXISTS team_status')
