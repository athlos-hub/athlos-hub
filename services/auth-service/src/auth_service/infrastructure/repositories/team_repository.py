"""Implementação PostgreSQL do repositório de Time."""

import logging
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from auth_service.infrastructure.database.models.enums import TeamInviteStatus, TeamStatus
from auth_service.infrastructure.database.models.team_model import Team, TeamInvite, TeamMember

logger = logging.getLogger(__name__)


class TeamRepository:
    """Repositório de Time."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, team_id: UUID) -> Optional[Team]:
        """Obtém time por UUID."""
        return await self._session.get(Team, team_id)

    async def get_by_id_with_members(self, team_id: UUID) -> Optional[Team]:
        """Obtém time por UUID com membros carregados."""
        stmt = (
            select(Team)
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
                selectinload(Team.organization),
            )
            .where(Team.id == team_id)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_organization_competition_name(
        self,
        organization_id: UUID,
        competition_id: int,
        name: str,
    ) -> Optional[Team]:
        """Verifica se já existe um time com esse nome na competição."""
        stmt = select(Team).where(
            and_(
                Team.organization_id == organization_id,
                Team.competition_id == competition_id,
                Team.name == name,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_teams(self, user_id: UUID) -> Sequence[Team]:
        """Obtém todos os times de um usuário."""
        stmt = (
            select(Team)
            .join(TeamMember, Team.id == TeamMember.team_id)
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
                selectinload(Team.organization),
            )
            .where(TeamMember.user_id == user_id)
            .order_by(Team.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_by_organization(
        self,
        organization_id: UUID,
        status: Optional[TeamStatus] = None,
    ) -> Sequence[Team]:
        """Obtém times de uma organização."""
        stmt = (
            select(Team)
            .options(
                selectinload(Team.members),
                selectinload(Team.organization),
            )
            .where(Team.organization_id == organization_id)
        )
        if status:
            stmt = stmt.where(Team.status == status)
        stmt = stmt.order_by(Team.created_at.desc())
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_user_team_in_competition(
        self,
        user_id: UUID,
        competition_id: int,
    ) -> Optional[Team]:
        """Verifica se o usuário já está em algum time desta competição."""
        stmt = (
            select(Team)
            .join(TeamMember, Team.id == TeamMember.team_id)
            .where(
                and_(
                    TeamMember.user_id == user_id,
                    Team.competition_id == competition_id,
                )
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, team: Team) -> Team:
        """Cria um novo time."""
        self._session.add(team)
        await self._session.flush()
        await self._session.refresh(team)
        return team

    async def update(self, team: Team) -> Team:
        """Atualiza um time."""
        await self._session.flush()
        await self._session.refresh(team)
        return team

    async def delete(self, team: Team) -> None:
        """Remove um time."""
        await self._session.delete(team)
        await self._session.flush()


class TeamMemberRepository:
    """Repositório de Membro de Time."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_team_and_user(
        self,
        team_id: UUID,
        user_id: UUID,
    ) -> Optional[TeamMember]:
        """Obtém membro do time por team_id e user_id."""
        stmt = select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_captain(self, team_id: UUID) -> Optional[TeamMember]:
        """Obtém o capitão do time."""
        stmt = (
            select(TeamMember)
            .options(joinedload(TeamMember.user))
            .where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.is_captain == True,
                )
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, member: TeamMember) -> TeamMember:
        """Adiciona um membro ao time."""
        self._session.add(member)
        await self._session.flush()
        await self._session.refresh(member)
        return member

    async def delete(self, member: TeamMember) -> None:
        """Remove um membro do time."""
        await self._session.delete(member)
        await self._session.flush()

    async def count_by_team(self, team_id: UUID) -> int:
        """Conta membros de um time."""
        stmt = select(TeamMember).where(TeamMember.team_id == team_id)
        result = await self._session.execute(stmt)
        return len(result.scalars().all())


class TeamInviteRepository:
    """Repositório de Convite de Time."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_token(self, token: str) -> Optional[TeamInvite]:
        """Obtém convite por token."""
        stmt = (
            select(TeamInvite)
            .options(
                joinedload(TeamInvite.team).selectinload(Team.organization),
            )
            .where(TeamInvite.invite_token == token)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_team(self, team_id: UUID) -> Sequence[TeamInvite]:
        """Obtém todos os convites de um time."""
        stmt = (
            select(TeamInvite)
            .where(TeamInvite.team_id == team_id)
            .order_by(TeamInvite.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_active_by_team(self, team_id: UUID) -> Sequence[TeamInvite]:
        """Obtém convites ativos de um time."""
        stmt = (
            select(TeamInvite)
            .where(
                and_(
                    TeamInvite.team_id == team_id,
                    TeamInvite.status == TeamInviteStatus.PENDING,
                )
            )
            .order_by(TeamInvite.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def create(self, invite: TeamInvite) -> TeamInvite:
        """Cria um novo convite."""
        self._session.add(invite)
        await self._session.flush()
        await self._session.refresh(invite)
        return invite

    async def update(self, invite: TeamInvite) -> TeamInvite:
        """Atualiza um convite."""
        await self._session.flush()
        await self._session.refresh(invite)
        return invite

    async def delete(self, invite: TeamInvite) -> None:
        """Remove um convite."""
        await self._session.delete(invite)
        await self._session.flush()
