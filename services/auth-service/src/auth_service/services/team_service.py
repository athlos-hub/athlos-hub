"""Serviço de Time com lógica de negócio."""

import logging
from typing import Optional, Sequence
from uuid import UUID

import httpx
from fastapi import UploadFile

from auth_service.core.config import settings
from auth_service.infrastructure.competitions_team_import import send_team_import_rpc
from auth_service.core.exceptions import (
    AlreadyTeamMemberError,
    CompetitionAlreadyStartedError,
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
    TeamProfileEditRestrictedError,
    TeamError,
    TeamStatusError,
    UserNotFoundError,
)
from auth_service.core.exceptions.user import AvatarUploadError
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
from auth_service.utils.upload_image import upload_image
from auth_service.infrastructure.notification_publisher import send_internal_notification

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
        logo: Optional[UploadFile] = None,
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

        if logo and getattr(logo, "filename", None):
            try:
                result = upload_image(
                    logo,
                    aws_access_key_id=settings.AWS_BUCKET_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_BUCKET_SECRET_ACCESS_KEY,
                    aws_region=settings.AWS_BUCKET_REGION,
                    aws_bucket=settings.AWS_BUCKET_NAME,
                    prefix="teams",
                    team_id=str(team.id),
                )
                team.logo_url = result["url"]
                await self._team_repo.update(team)
            except AvatarUploadError as exc:
                raise exc

        logger.info(
            f"Time '{team.name}' criado por {creator.email} na competição {data.competition_id}"
        )

        # Recarregar time com membros
        return await self._team_repo.resolve_team_with_members(team.id)

    async def update_team(
        self,
        team_id: UUID,
        captain_keycloak_id: str,
        name: Optional[str] = None,
        abbreviation: Optional[str] = None,
        logo: Optional[UploadFile] = None,
        remove_logo: bool = False,
    ) -> Team:
        """
        Atualiza dados do time. Apenas o capitão pode editar.
        Times já aprovados na competição só podem alterar a imagem do escudo.
        """
        team = await self._team_repo.resolve_team_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        user = await self._user_repo.get_by_keycloak_id(captain_keycloak_id)
        if not user:
            raise UserNotFoundError(captain_keycloak_id)

        captain = team.captain
        if not captain or captain.user_id != user.id:
            raise NotTeamCaptainError()

        approved = team.status == TeamStatus.APPROVED

        def _norm(s: Optional[str]) -> Optional[str]:
            if s is None:
                return None
            t = s.strip()
            return t if t else None

        name = _norm(name)
        abbreviation = _norm(abbreviation)

        if approved:
            if name is not None and name != team.name:
                raise TeamProfileEditRestrictedError()
            if abbreviation is not None and abbreviation.upper() != team.abbreviation:
                raise TeamProfileEditRestrictedError()
        else:
            if name is not None:
                existing = await self._team_repo.get_by_organization_competition_name(
                    team.organization_id, team.competition_id, name
                )
                if existing and existing.id != team.id:
                    raise TeamAlreadyExistsError(name, team.competition_id)
                team.name = name

            if abbreviation is not None:
                team.abbreviation = abbreviation.upper()

        if remove_logo:
            team.logo_url = None

        if logo and getattr(logo, "filename", None):
            try:
                result = upload_image(
                    logo,
                    aws_access_key_id=settings.AWS_BUCKET_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_BUCKET_SECRET_ACCESS_KEY,
                    aws_region=settings.AWS_BUCKET_REGION,
                    aws_bucket=settings.AWS_BUCKET_NAME,
                    prefix="teams",
                    team_id=str(team.id),
                )
                team.logo_url = result["url"]
            except AvatarUploadError as exc:
                raise exc

        await self._team_repo.update(team)
        updated = await self._team_repo.resolve_team_with_members(team.id)
        if updated and updated.external_team_id and (
            remove_logo or (logo and getattr(logo, "filename", None))
        ):
            await self._sync_team_logo_to_competitions(
                updated.external_team_id, updated.logo_url
            )
        return updated

    # ==================== Listagem ====================

    async def get_team(self, team_id: UUID) -> Team:
        """Obtém um time pelo ID."""
        team = await self._team_repo.resolve_team_with_members(team_id)
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
        competition_id: Optional[UUID] = None,
    ) -> Sequence[Team]:
        """
        Obtém times pendentes de aprovação (status READY) de uma organização.
        Opcionalmente filtra pela competição (UUID no competitions-service).
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

        return await self._team_repo.get_by_organization(
            org.id, TeamStatus.READY, competition_id=competition_id
        )

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
        team = await self._team_repo.resolve_team_with_members(team_id)
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
        team = await self._team_repo.resolve_team_with_members(team_id)
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
        return await self._invite_repo.get_active_by_team(team.id)

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
        team = await self._team_repo.resolve_team_with_members(team.id)
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
        team = await self._team_repo.resolve_team_with_members(team_id)
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
        member = await self._member_repo.get_by_team_and_user(team.id, member_user_id)
        if not member:
            raise NotTeamMemberError()

        # Remover
        await self._member_repo.delete(member)

        # Atualizar status do time
        await self._update_team_status(team)

        logger.info(f"Membro {member_user_id} removido do time '{team.name}'")

        return await self._team_repo.resolve_team_with_members(team.id)

    async def leave_team(
        self,
        team_id: UUID,
        leaver_keycloak_id: str,
    ) -> None:
        """
        Sai do time.
        Capitão não pode sair (deve transferir capitania primeiro ou deletar time).
        """
        team = await self._team_repo.resolve_team_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        user = await self._user_repo.get_by_keycloak_id(leaver_keycloak_id)
        if not user:
            raise UserNotFoundError(leaver_keycloak_id)

        member = await self._member_repo.get_by_team_and_user(team.id, user.id)
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
        team = await self._team_repo.resolve_team_with_members(team_id)
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
        new_captain_member = await self._member_repo.get_by_team_and_user(team.id, new_captain_user_id)
        if not new_captain_member:
            raise NotTeamMemberError()

        # Transferir
        captain.is_captain = False
        new_captain_member.is_captain = True

        await self._team_repo.update(team)

        logger.info(f"Capitania do time '{team.name}' transferida para {new_captain_user_id}")

        return await self._team_repo.resolve_team_with_members(team.id)

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
        team = await self._team_repo.resolve_team_with_members(team_id)
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

        await self._notify_team_approval_requested(team)

        return team

    async def _notify_team_approval_requested(self, team: Team) -> None:
        """Notifica dono e organizadores sobre pedido de aprovação (exceto o capitão)."""
        org = team.organization
        if not org:
            return

        captain = team.captain
        captain_user_id = captain.user_id if captain else None

        recipient_ids: set[UUID] = {org.owner_id}
        organizers = await self._org_organizer_repo.get_organizers_by_org(org.id)
        for row in organizers:
            recipient_ids.add(row.user_id)

        if captain_user_id is not None:
            recipient_ids.discard(captain_user_id)

        if not recipient_ids:
            return

        action_url = f"/competitions/{team.competition_id}?tab=teams"
        title = "Pedido de aprovação de equipe"
        message = (
            f'O time "{team.name}" solicitou aprovação para participar '
            f'da competição "{team.competition_name}".'
        )
        extra = {
            "organization_id": str(org.id),
            "organization_name": org.name,
            "organization_slug": org.slug,
            "team_id": str(team.id),
            "team_name": team.name,
            "competition_id": str(team.competition_id),
            "competition_name": team.competition_name,
        }

        for uid in recipient_ids:
            await send_internal_notification(
                user_id=uid,
                notification_type="organization_team_approval_request",
                title=title,
                message=message,
                extra_data=extra,
                action_url=action_url,
            )

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
        team = await self._team_repo.resolve_team_with_members(team_id)
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
            logo_url=team.logo_url,
            auth_team_id=team.id,
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
        team = await self._team_repo.resolve_team_with_members(team_id)
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
        Deleta um time. Apenas o capitão pode excluir.
        Se o time já estiver aprovado no competitions (tem ``external_team_id``),
        só é permitido enquanto a competição estiver *pending* e remove o espelho lá.
        Times ainda não aprovados são removidos só no auth, sem chamar o competitions.
        """
        team = await self._team_repo.resolve_team_with_members(team_id)
        if not team:
            raise TeamNotFoundError(str(team_id))

        user = await self._user_repo.get_by_keycloak_id(deleter_keycloak_id)
        if not user:
            raise UserNotFoundError(deleter_keycloak_id)

        captain = team.captain
        if not captain or captain.user_id != user.id:
            raise NotTeamCaptainError()

        # Só fala com o competitions se o time já foi aprovado e espelhado lá.
        # Time ainda PENDING/RECRUITING/READY não tem registro no competitions — evita erro ao excluir.
        if team.external_team_id is not None:
            comp_status = await self._fetch_competition_status(team.competition_id)
            if comp_status is None:
                raise CompetitionServiceError(
                    "Não foi possível verificar o status da competição. Tente novamente."
                )
            if str(comp_status).strip().lower() != "pending":
                raise CompetitionAlreadyStartedError()

            await self._delete_competition_team_mirror(team.id, team.external_team_id)

        await self._team_repo.delete(team)

        logger.info(f"Time '{team.name}' deletado por {user.email} (capitão)")

    async def _fetch_competition_status(self, competition_id: UUID) -> Optional[str]:
        """Consulta status da competição no competitions-service (JSON)."""
        competitions_url = getattr(
            settings, "COMPETITIONS_SERVICE_URL", "http://localhost:8100"
        )
        url = f"{competitions_url.rstrip('/')}/api/competitions/{competition_id}"
        try:
            timeout = httpx.Timeout(12.0, connect=5.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    return None
                data = response.json()
                status = data.get("status")
                if status is None:
                    return None
                if hasattr(status, "value"):
                    return str(status.value)
                return str(status)
        except httpx.RequestError:
            return None

    async def _delete_competition_team_mirror(
        self,
        auth_team_id: UUID,
        external_team_id: Optional[UUID] = None,
    ) -> None:
        """
        Remove o espelho no competitions (e enfileira limpeza no social).
        Com RabbitMQ: apenas RPC durável teams.mirror.delete.
        Sem fila: HTTP interno (dev).
        """
        if (settings.RABBITMQ_URL or "").strip():
            from auth_service.infrastructure.competitions_mirror_delete import (
                send_team_mirror_delete_rpc,
            )

            await send_team_mirror_delete_rpc(
                auth_team_id, external_team_id, timeout=30.0
            )
            return

        base = getattr(
            settings, "COMPETITIONS_SERVICE_URL", "http://localhost:8100"
        ).rstrip("/")
        url_by_auth = f"{base}/api/internal/teams/by-auth/{auth_team_id}"
        try:
            timeout = httpx.Timeout(15.0, connect=5.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.delete(url_by_auth)
                if response.status_code in (200, 204):
                    return
                if response.status_code == 404 and external_team_id:
                    url_by_ext = f"{base}/api/internal/teams/{external_team_id}"
                    response = await client.delete(url_by_ext)
                    if response.status_code in (200, 204):
                        return
                if response.status_code == 404:
                    return
                detail = response.text
                logger.error(
                    "Falha ao remover time no competitions-service: %s %s",
                    response.status_code,
                    detail,
                )
                raise CompetitionServiceError(detail or "resposta inválida")
        except httpx.RequestError as e:
            logger.error("Erro de conexão ao remover time no competitions: %s", e)
            raise CompetitionServiceError(str(e)) from e

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
        """Envia time aprovado: RabbitMQ RPC se houver fila; senão HTTP (dev)."""
        if settings.RABBITMQ_URL:
            return await send_team_import_rpc(payload)

        competitions_url = getattr(
            settings, "COMPETITIONS_SERVICE_URL", "http://localhost:8100"
        )
        url = f"{competitions_url}/api/internal/teams"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload.model_dump(mode="json"),
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

    async def _sync_team_logo_to_competitions(
        self, external_team_id: UUID, logo_url: Optional[str]
    ) -> None:
        """Propaga escudo do auth para o competitions (fila se houver; senão HTTP)."""
        if settings.RABBITMQ_URL:
            from auth_service.infrastructure.team_logo_publisher import (
                publish_team_logo_sync,
            )

            await publish_team_logo_sync(external_team_id, logo_url)
            return

        competitions_url = getattr(
            settings, "COMPETITIONS_SERVICE_URL", "http://localhost:8100"
        )
        url = f"{competitions_url}/api/internal/teams/{external_team_id}/logo"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.patch(
                    url,
                    json={"logo_url": logo_url},
                    headers={"Content-Type": "application/json"},
                )
                if response.status_code not in (204, 200):
                    logger.error(
                        "Erro ao sincronizar escudo no competitions: %s - %s",
                        response.status_code,
                        response.text,
                    )
        except httpx.RequestError as e:
            logger.error(f"Erro de conexão ao sincronizar escudo no competitions: {e}")

