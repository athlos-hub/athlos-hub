"""Serviço de Time com lógica de negócio."""

import logging
from typing import Optional, Sequence
from uuid import UUID

import httpx

from auth_service.core.config import settings
from auth_service.core.exceptions import (
    AlreadyTeamMemberError,
    CompetitionServiceError,
    NotTeamCaptainError,
    NotTeamMemberError,
    OrganizationNotFoundError,
    PlayerAlreadyInCompetitionError,
    TeamAlreadyApprovedError,
    TeamAlreadyExistsError,
    TeamFullError,
    TeamInviteExpiredError,
    TeamInviteNotFoundError,
    TeamNotFoundError,
    TeamNotReadyError,
    TeamStatusError,
    UserNotFoundError,
)
from auth_service.infrastructure.database.models.enums import (
    MemberStatus,
    TeamInviteStatus,
    TeamStatus,
)
from auth_service.infrastructure.database.models.organization_model import OrganizationMember
from auth_service.infrastructure.database.models.team_model import Team, TeamInvite, TeamMember
from auth_service.repositories.organization_member_repository import OrganizationMemberRepository
from auth_service.repositories.organization_organizer_repository import (
    OrganizationOrganizerRepository,
)
from auth_service.repositories.organization_repository import OrganizationRepository
from auth_service.repositories.team_repository import (
    TeamInviteRepository,
    TeamMemberRepository,
    TeamRepository,
)
from auth_service.repositories.user_repository import UserRepository
from auth_service.schemas.team import (
    CreateInviteRequest,
    PlayerPayload,
    TeamApprovalPayload,
    TeamCreateRequest,
)

logger = logging.getLogger(__name__)


class TeamService:
    """Serviço contendo toda lógica de negócio relacionada a times."""

    def __init__(
        self,
        team_repository: TeamRepository,
        member_repository: TeamMemberRepository,
        invite_repository: TeamInviteRepository,
        org_repository: OrganizationRepository,
        org_member_repository: OrganizationMemberRepository,
        org_organizer_repository: OrganizationOrganizerRepository,
        user_repository: UserRepository,
    ):
        self._team_repo = team_repository
        self._member_repo = member_repository
        self._invite_repo = invite_repository
        self._org_repo = org_repository
        self._org_member_repo = org_member_repository
        self._org_organizer_repo = org_organizer_repository
        self._user_repo = user_repository

    # ==================== Criação de Time ====================

    async def create_team(
        self,
        data: TeamCreateRequest,
        creator_keycloak_id: str,
    ) -> Team:
        """
        Cria um novo time.

        O criador deve ser membro da organização.
        O time é criado com status RECRUITING.
        """
        # 1. Buscar organização pelo slug
        org = await self._org_repo.get_by_slug(data.organization_slug)
        if not org:
            raise OrganizationNotFoundError(data.organization_slug)

        # 2. Buscar usuário criador
        creator = await self._user_repo.get_by_keycloak_id(creator_keycloak_id)
        if not creator:
            raise UserNotFoundError(creator_keycloak_id)

        # 3. Verificar se criador é membro da organização
        membership = await self._org_member_repo.get_membership_by_status(
            org.id, creator.id, MemberStatus.ACTIVE
        )
        is_member = membership is not None
        is_owner = org.owner_id == creator.id
        if not is_member and not is_owner:
            raise NotTeamMemberError()

        # 4. Verificar se já existe time com esse nome na competição
        existing = await self._team_repo.get_by_organization_competition_name(
            org.id, data.competition_id, data.name
        )
        if existing:
            raise TeamAlreadyExistsError(data.name, data.competition_id)

        # 5. Verificar se criador já está em outro time desta competição
        existing_team = await self._team_repo.get_user_team_in_competition(
            creator.id, data.competition_id
        )
        if existing_team:
            raise PlayerAlreadyInCompetitionError(creator_keycloak_id)

        # 6. Criar time
        team = Team(
            organization_id=org.id,
            competition_id=data.competition_id,
            competition_name=data.competition_name,
            name=data.name,
            abbreviation=data.abbreviation.upper(),
            status=TeamStatus.RECRUITING,
            min_members=data.min_members,
            max_members=data.max_members,
            created_by=creator.id,
        )
        team = await self._team_repo.create(team)

        # 7. Adicionar criador como capitão
        captain = TeamMember(
            team_id=team.id,
            user_id=creator.id,
            is_captain=True,
        )
        await self._member_repo.create(captain)

        logger.info(
            f"Time '{team.name}' criado por {creator.email} na competição {data.competition_id}"
        )

        # Recarregar time com membros
        return await self._team_repo.get_by_id_with_members(team.id)

    # ==================== Listagem ====================

    async def get_team(self, team_id: UUID) -> Team:
        """Obtém um time pelo ID."""
        team = await self._team_repo.get_by_id_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))
        return team

    async def get_user_teams(self, keycloak_id: str) -> Sequence[Team]:
        """Obtém todos os times do usuário."""
        user = await self._user_repo.get_by_keycloak_id(keycloak_id)
        if not user:
            return []
        return await self._team_repo.get_user_teams(user.id)

    async def get_organization_teams(
        self,
        organization_slug: str,
        status: Optional[TeamStatus] = None,
    ) -> Sequence[Team]:
        """Obtém times de uma organização."""
        org = await self._org_repo.get_by_slug(organization_slug)
        if not org:
            raise OrganizationNotFoundError(organization_slug)
        return await self._team_repo.get_by_organization(org.id, status)

    async def get_pending_teams(
        self,
        organization_slug: str,
        requester_keycloak_id: str,
    ) -> Sequence[Team]:
        """
        Obtém times pendentes de aprovação (status READY) de uma organização.
        Apenas owner/organizer podem ver.
        """
        org = await self._org_repo.get_by_slug(organization_slug)
        if not org:
            raise OrganizationNotFoundError(organization_slug)

        # Verificar permissão
        user = await self._user_repo.get_by_keycloak_id(requester_keycloak_id)
        if not user:
            raise UserNotFoundError(requester_keycloak_id)

        is_owner = org.owner_id == user.id
        is_organizer = await self._org_organizer_repo.is_organizer(org.id, user.id)

        if not is_owner and not is_organizer:
            raise NotTeamCaptainError()  # Reutilizando exceção

        return await self._team_repo.get_by_organization(org.id, TeamStatus.READY)

    # ==================== Convites ====================

    async def create_invite(
        self,
        team_id: UUID,
        data: CreateInviteRequest,
        creator_keycloak_id: str,
    ) -> TeamInvite:
        """
        Cria um convite para o time.
        Apenas o capitão pode criar convites.
        """
        team = await self._team_repo.get_by_id_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        # Verificar se é capitão
        user = await self._user_repo.get_by_keycloak_id(creator_keycloak_id)
        if not user:
            raise UserNotFoundError(creator_keycloak_id)

        captain = team.captain
        if not captain or captain.user_id != user.id:
            raise NotTeamCaptainError()

        # Verificar se time pode receber membros
        if team.status not in [TeamStatus.PENDING, TeamStatus.RECRUITING, TeamStatus.READY]:
            raise TeamStatusError(
                team.status.value,
                [TeamStatus.PENDING.value, TeamStatus.RECRUITING.value, TeamStatus.READY.value],
            )

        # Verificar se time está cheio
        if team.member_count >= team.max_members:
            raise TeamFullError(team.max_members)

        # Criar convite
        invite = TeamInvite(
            team_id=team.id,
            invite_token=TeamInvite.generate_token(),
            created_by=user.id,
            expires_at=TeamInvite.default_expiration(data.expires_in_days),
            max_uses=data.max_uses,
        )
        invite = await self._invite_repo.create(invite)

        logger.info(f"Convite criado para time '{team.name}' por {user.email}")

        return invite

    async def get_team_invites(
        self,
        team_id: UUID,
        requester_keycloak_id: str,
    ) -> Sequence[TeamInvite]:
        """
        Lista convites do time.
        Apenas o capitão pode ver os convites.
        """
        team = await self._team_repo.get_by_id_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        # Verificar se é capitão
        user = await self._user_repo.get_by_keycloak_id(requester_keycloak_id)
        if not user:
            raise UserNotFoundError(requester_keycloak_id)

        captain = team.captain
        if not captain or captain.user_id != user.id:
            raise NotTeamCaptainError()

        # Retornar convites ativos
        return await self._invite_repo.get_active_by_team(team_id)

    async def validate_invite(self, token: str) -> TeamInvite:
        """Valida um convite pelo token."""
        invite = await self._invite_repo.get_by_token(token)
        if not invite:
            raise TeamInviteNotFoundError(token)

        if not invite.is_valid:
            if invite.status != TeamInviteStatus.PENDING:
                raise TeamInviteNotFoundError(token)
            raise TeamInviteExpiredError()

        return invite

    async def accept_invite(
        self,
        token: str,
        acceptor_keycloak_id: str,
    ) -> tuple[Team, bool]:
        """
        Aceita um convite para entrar no time.

        Se o usuário não for membro da organização, será adicionado automaticamente.

        Returns:
            Tuple[Team, bool]: Time e flag indicando se usuário foi adicionado à organização
        """
        # 1. Validar convite
        invite = await self.validate_invite(token)
        team = invite.team

        # 2. Buscar/criar usuário
        user = await self._user_repo.get_by_keycloak_id(acceptor_keycloak_id)
        if not user:
            raise UserNotFoundError(acceptor_keycloak_id)

        # 3. Verificar se já é membro do time
        existing_member = await self._member_repo.get_by_team_and_user(team.id, user.id)
        if existing_member:
            raise AlreadyTeamMemberError()

        # 4. Verificar se time pode receber membros
        if team.status not in [TeamStatus.PENDING, TeamStatus.RECRUITING, TeamStatus.READY]:
            raise TeamStatusError(
                team.status.value,
                [TeamStatus.PENDING.value, TeamStatus.RECRUITING.value, TeamStatus.READY.value],
            )

        # 5. Verificar se time está cheio
        current_count = await self._member_repo.count_by_team(team.id)
        if current_count >= team.max_members:
            raise TeamFullError(team.max_members)

        # 6. Verificar se usuário já está em outro time da competição
        existing_team = await self._team_repo.get_user_team_in_competition(
            user.id, team.competition_id
        )
        if existing_team:
            raise PlayerAlreadyInCompetitionError(acceptor_keycloak_id)

        # 7. Verificar se usuário é membro da organização, se não, adicionar
        added_to_org = False
        membership = await self._org_member_repo.get_membership_by_status(
            team.organization_id, user.id, MemberStatus.ACTIVE
        )
        is_member = membership is not None
        is_owner = team.organization.owner_id == user.id if team.organization else False

        if not is_member and not is_owner:
            # Adicionar à organização automaticamente
            org_member = OrganizationMember(
                organization_id=team.organization_id,
                user_id=user.id,
                status=MemberStatus.ACTIVE,
            )
            await self._org_member_repo.create(org_member)
            added_to_org = True
            logger.info(f"Usuário {user.email} adicionado à organização ao aceitar convite do time")

        # 8. Adicionar ao time
        member = TeamMember(
            team_id=team.id,
            user_id=user.id,
            is_captain=False,
        )
        await self._member_repo.create(member)

        # 9. Atualizar convite
        invite.use_count += 1
        if invite.max_uses and invite.use_count >= invite.max_uses:
            invite.status = TeamInviteStatus.ACCEPTED
        await self._invite_repo.update(invite)

        # 10. Atualizar status do time se necessário
        await self._update_team_status(team)

        logger.info(f"Usuário {user.email} entrou no time '{team.name}'")

        # Recarregar time
        team = await self._team_repo.get_by_id_with_members(team.id)
        return team, added_to_org

    async def revoke_invite(
        self,
        invite_id: UUID,
        revoker_keycloak_id: str,
    ) -> None:
        """Revoga um convite. Apenas o capitão pode revogar."""
        # Implementar se necessário
        pass

    # ==================== Gerenciamento de Membros ====================

    async def remove_member(
        self,
        team_id: UUID,
        member_user_id: UUID,
        remover_keycloak_id: str,
    ) -> Team:
        """
        Remove um membro do time.
        Apenas o capitão pode remover membros (exceto a si mesmo).
        """
        team = await self._team_repo.get_by_id_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        # Verificar se é capitão
        remover = await self._user_repo.get_by_keycloak_id(remover_keycloak_id)
        if not remover:
            raise UserNotFoundError(remover_keycloak_id)

        captain = team.captain
        if not captain or captain.user_id != remover.id:
            raise NotTeamCaptainError()

        # Não pode remover a si mesmo (capitão)
        if member_user_id == remover.id:
            raise NotTeamCaptainError()  # Usar exceção apropriada

        # Buscar membro
        member = await self._member_repo.get_by_team_and_user(team_id, member_user_id)
        if not member:
            raise NotTeamMemberError()

        # Remover
        await self._member_repo.delete(member)

        # Atualizar status do time
        await self._update_team_status(team)

        logger.info(f"Membro {member_user_id} removido do time '{team.name}'")

        return await self._team_repo.get_by_id_with_members(team_id)

    async def leave_team(
        self,
        team_id: UUID,
        leaver_keycloak_id: str,
    ) -> None:
        """
        Sai do time.
        Capitão não pode sair (deve transferir capitania primeiro ou deletar time).
        """
        team = await self._team_repo.get_by_id_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        user = await self._user_repo.get_by_keycloak_id(leaver_keycloak_id)
        if not user:
            raise UserNotFoundError(leaver_keycloak_id)

        member = await self._member_repo.get_by_team_and_user(team_id, user.id)
        if not member:
            raise NotTeamMemberError()

        # Capitão não pode sair
        if member.is_captain:
            raise NotTeamCaptainError()

        await self._member_repo.delete(member)
        await self._update_team_status(team)

        logger.info(f"Usuário {user.email} saiu do time '{team.name}'")

    async def transfer_captaincy(
        self,
        team_id: UUID,
        new_captain_user_id: UUID,
        current_captain_keycloak_id: str,
    ) -> Team:
        """Transfere a capitania para outro membro."""
        team = await self._team_repo.get_by_id_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        # Verificar capitão atual
        current_captain_user = await self._user_repo.get_by_keycloak_id(current_captain_keycloak_id)
        if not current_captain_user:
            raise UserNotFoundError(current_captain_keycloak_id)

        captain = team.captain
        if not captain or captain.user_id != current_captain_user.id:
            raise NotTeamCaptainError()

        # Buscar novo capitão
        new_captain_member = await self._member_repo.get_by_team_and_user(team_id, new_captain_user_id)
        if not new_captain_member:
            raise NotTeamMemberError()

        # Transferir
        captain.is_captain = False
        new_captain_member.is_captain = True

        await self._team_repo.update(team)

        logger.info(f"Capitania do time '{team.name}' transferida para {new_captain_user_id}")

        return await self._team_repo.get_by_id_with_members(team_id)

    # ==================== Aprovação ====================

    async def request_approval(
        self,
        team_id: UUID,
        requester_keycloak_id: str,
    ) -> Team:
        """
        Solicita aprovação do time (apenas capitão).
        Muda o status do time para READY.
        """
        team = await self._team_repo.get_by_id_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        # Verificar se já foi aprovado ou rejeitado
        if team.status == TeamStatus.APPROVED:
            raise TeamAlreadyApprovedError()

        if team.status == TeamStatus.REJECTED:
            raise TeamStatusError(
                team.status.value,
                [TeamStatus.RECRUITING.value, TeamStatus.PENDING.value],
            )

        # Verificar se já está com status READY
        if team.status == TeamStatus.READY:
            return team

        # Verificar mínimo de membros
        if not team.is_ready_for_approval:
            raise TeamNotReadyError(team.member_count, team.min_members)

        # Verificar se é capitão
        user = await self._user_repo.get_by_keycloak_id(requester_keycloak_id)
        if not user:
            raise UserNotFoundError(requester_keycloak_id)

        captain = team.captain
        if not captain or captain.user_id != user.id:
            raise NotTeamCaptainError()

        # Atualizar status para READY
        team.status = TeamStatus.READY
        await self._team_repo.update(team)

        logger.info(f"Time '{team.name}' solicitou aprovação. Status: READY")

        return team

    async def approve_team(
        self,
        team_id: UUID,
        approver_keycloak_id: str,
    ) -> tuple[Team, UUID]:
        """
        Aprova o time e envia para o competitions-service.

        Apenas admin/organizer da organização pode aprovar.

        Returns:
            Tuple[Team, UUID]: Time atualizado e ID externo no competitions-service
        """
        team = await self._team_repo.get_by_id_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        # Verificar status
        if team.status == TeamStatus.APPROVED:
            raise TeamAlreadyApprovedError()

        if team.status != TeamStatus.READY:
            raise TeamStatusError(
                team.status.value,
                [TeamStatus.READY.value],
            )

        # Verificar mínimo de membros
        if not team.is_ready_for_approval:
            raise TeamNotReadyError(team.member_count, team.min_members)

        # Verificar permissão (APENAS organizer da org)
        user = await self._user_repo.get_by_keycloak_id(approver_keycloak_id)
        if not user:
            raise UserNotFoundError(approver_keycloak_id)

        is_owner = team.organization.owner_id == user.id if team.organization else False

        # Verificar se é organizer
        is_organizer = await self._org_organizer_repo.is_organizer(team.organization_id, user.id)

        if not is_owner and not is_organizer:
            raise NotTeamCaptainError()  # Reutilizando exceção, mas poderia ser uma específica

        # Obter o capitão
        captain = team.captain
        if not captain:
            raise NotTeamCaptainError()  # Time sem capitão

        # Preparar payload para competitions-service
        payload = TeamApprovalPayload(
            organization_slug=team.organization.slug,
            competition_id=team.competition_id,
            name=team.name,
            abbreviation=team.abbreviation,
            captain_keycloak_id=captain.user.keycloak_id,
            players=[PlayerPayload(keycloak_id=m.user.keycloak_id) for m in team.members],
        )

        # Enviar para competitions-service
        external_team_id = await self._send_to_competitions_service(payload)

        # Atualizar time
        team.status = TeamStatus.APPROVED
        team.external_team_id = external_team_id
        await self._team_repo.update(team)

        logger.info(
            f"Time '{team.name}' aprovado e enviado para competitions-service. "
            f"External ID: {external_team_id}"
        )

        return team, external_team_id

    async def reject_team(
        self,
        team_id: UUID,
        rejecter_keycloak_id: str,
        reason: Optional[str] = None,
    ) -> Team:
        """Rejeita um time (apenas admin/organizer)."""
        team = await self._team_repo.get_by_id_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        if team.status == TeamStatus.APPROVED:
            raise TeamAlreadyApprovedError()

        # Verificar permissão (deve ser organizer ou owner)
        user = await self._user_repo.get_by_keycloak_id(rejecter_keycloak_id)
        if not user:
            raise UserNotFoundError(rejecter_keycloak_id)

        is_owner = team.organization.owner_id == user.id if team.organization else False
        is_organizer = await self._org_organizer_repo.is_organizer(team.organization_id, user.id)

        if not is_owner and not is_organizer:
            raise NotTeamCaptainError()

        team.status = TeamStatus.REJECTED
        await self._team_repo.update(team)

        logger.info(f"Time '{team.name}' rejeitado. Motivo: {reason}")

        return team

    # ==================== Deletar ====================

    async def delete_team(
        self,
        team_id: UUID,
        deleter_keycloak_id: str,
    ) -> None:
        """
        Deleta um time.
        Apenas o capitão ou owner/organizer pode deletar.
        Não pode deletar time aprovado.
        """
        team = await self._team_repo.get_by_id_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        if team.status == TeamStatus.APPROVED:
            raise TeamAlreadyApprovedError()

        user = await self._user_repo.get_by_keycloak_id(deleter_keycloak_id)
        if not user:
            raise UserNotFoundError(deleter_keycloak_id)

        captain = team.captain
        is_captain = captain and captain.user_id == user.id
        is_owner = team.organization.owner_id == user.id if team.organization else False
        is_organizer = await self._org_organizer_repo.is_organizer(team.organization_id, user.id)

        if not is_captain and not is_owner and not is_organizer:
            raise NotTeamCaptainError()

        await self._team_repo.delete(team)

        logger.info(f"Time '{team.name}' deletado por {user.email}")

    # ==================== Helpers ====================

    async def _update_team_status(self, team: Team) -> None:
        """Atualiza o status do time baseado no número de membros."""
        if team.status in [TeamStatus.APPROVED, TeamStatus.REJECTED]:
            return

        current_count = await self._member_repo.count_by_team(team.id)

        if current_count >= team.min_members:
            if team.status != TeamStatus.READY:
                team.status = TeamStatus.READY
                await self._team_repo.update(team)
        else:
            if team.status == TeamStatus.READY:
                team.status = TeamStatus.RECRUITING
                await self._team_repo.update(team)

    async def _send_to_competitions_service(self, payload: TeamApprovalPayload) -> UUID:
        """Envia time aprovado para o competitions-service."""
        # URL do competitions-service (usar variável de ambiente)
        competitions_url = getattr(
            settings, "COMPETITIONS_SERVICE_URL", "http://localhost:8100"
        )
        url = f"{competitions_url}/api/internal/teams"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload.model_dump(),
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code != 201:
                    detail = response.text
                    logger.error(
                        f"Erro ao enviar time para competitions: {response.status_code} - {detail}"
                    )
                    raise CompetitionServiceError(detail)

                data = response.json()
                return UUID(data["id"])

        except httpx.RequestError as e:
            logger.error(f"Erro de conexão com competitions-service: {e}")
            raise CompetitionServiceError(str(e))

