"""Endpoints de Teams."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth_service.api.deps import get_current_db_user, get_session
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
from auth_service.domain.services.team_service import TeamService
from auth_service.infrastructure.database.models.enums import TeamStatus
from auth_service.infrastructure.database.models.user_model import User
from auth_service.infrastructure.repositories.organization_member_repository import (
    OrganizationMemberRepository,
)
from auth_service.infrastructure.repositories.organization_organizer_repository import (
    OrganizationOrganizerRepository,
)
from auth_service.infrastructure.repositories.organization_repository import (
    OrganizationRepository,
)
from auth_service.infrastructure.repositories.team_repository import (
    TeamInviteRepository,
    TeamMemberRepository,
    TeamRepository,
)
from auth_service.infrastructure.repositories.user_repository import UserRepository
from auth_service.schemas.team import (
    AcceptInviteResponse,
    CreateInviteRequest,
    InviteValidationResponse,
    TeamApprovalResponse,
    TeamCreateRequest,
    TeamDetailResponse,
    TeamInviteResponse,
    TeamListItemResponse,
    TeamMemberResponse,
    TeamRejectionRequest,
    TeamResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teams", tags=["Teams"])


def get_team_service(session: AsyncSession = Depends(get_session)) -> TeamService:
    """Factory para criar TeamService com dependências."""
    return TeamService(
        team_repository=TeamRepository(session),
        member_repository=TeamMemberRepository(session),
        invite_repository=TeamInviteRepository(session),
        org_repository=OrganizationRepository(session),
        org_member_repository=OrganizationMemberRepository(session),
        org_organizer_repository=OrganizationOrganizerRepository(session),
        user_repository=UserRepository(session),
    )


def _build_team_response(team, user_keycloak_id: Optional[str] = None) -> TeamResponse:
    """Helper para construir response de time."""
    captain = team.captain
    return TeamResponse(
        id=team.id,
        organization_id=team.organization_id,
        organization_slug=team.organization.slug if team.organization else "",
        organization_name=team.organization.name if team.organization else None,
        competition_name=team.competition_name,
        name=team.name,
        abbreviation=team.abbreviation,
        status=team.status.value,
        captain_id=captain.user.keycloak_id if captain and captain.user else "",
        min_members=team.min_members,
        max_members=team.max_members,
        member_count=len(team.members),
        created_at=team.created_at,
        updated_at=team.updated_at,
    )


def _build_team_detail_response(team) -> TeamDetailResponse:
    """Helper para construir response detalhado de time."""
    from auth_service.schemas.team import TeamMemberUser
    
    members = []
    captain = team.captain
    for m in team.members:
        user_data = TeamMemberUser(
            id=m.user.id if m.user else m.user_id,
            keycloak_id=m.user.keycloak_id if m.user else "",
            username=m.user.username if m.user else None,
            first_name=m.user.first_name if m.user else None,
            last_name=m.user.last_name if m.user else None,
            avatar_url=m.user.avatar_url if m.user else None,
        )
        members.append(TeamMemberResponse(
            id=m.id,
            team_id=m.team_id,
            user_id=m.user_id,
            is_captain=m.is_captain,
            joined_at=m.created_at,
            user=user_data,
        ))

    return TeamDetailResponse(
        id=team.id,
        organization_id=team.organization_id,
        organization_slug=team.organization.slug if team.organization else "",
        organization_name=team.organization.name if team.organization else None,
        competition_name=team.competition_name,
        name=team.name,
        abbreviation=team.abbreviation,
        status=team.status.value,
        captain_id=captain.user.keycloak_id if captain and captain.user else "",
        min_members=team.min_members,
        max_members=team.max_members,
        member_count=len(team.members),
        created_at=team.created_at,
        updated_at=team.updated_at,
        members=members,
        external_team_id=team.external_team_id,
    )


def _build_team_list_item(team, user_id: UUID) -> TeamListItemResponse:
    """Helper para construir item de listagem de time."""
    is_captain = any(m.is_captain and m.user_id == user_id for m in team.members)
    return TeamListItemResponse(
        id=team.id,
        organization_slug=team.organization.slug if team.organization else "",
        organization_name=team.organization.name if team.organization else None,
        competition_name=team.competition_name,
        name=team.name,
        abbreviation=team.abbreviation,
        status=team.status.value,
        player_count=len(team.members),
        role="CAPTAIN" if is_captain else "PLAYER",
        created_at=team.created_at,
    )


def _build_invite_response(invite) -> TeamInviteResponse:
    """Helper para construir response de convite."""
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    invite_url = f"{frontend_url}/convite/time/{invite.invite_token}"
    
    return TeamInviteResponse(
        id=invite.id,
        team_id=invite.team_id,
        invite_token=invite.invite_token,
        invite_url=invite_url,
        expires_at=invite.expires_at,
        status=invite.status.value,
        max_uses=invite.max_uses,
        use_count=invite.use_count,
        created_at=invite.created_at,
    )


# ==================== Criação ====================

@router.post("/", response_model=TeamDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    data: TeamCreateRequest,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """
    Cria um novo time.
    
    O usuário deve ser membro da organização.
    """
    try:
        team = await service.create_team(data, str(current_user.keycloak_id))
        return _build_team_detail_response(team)
    except OrganizationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TeamAlreadyExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except PlayerAlreadyInCompetitionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotTeamMemberError:
        raise HTTPException(status_code=403, detail="Você precisa ser membro da organização para criar times")
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ==================== Listagem ====================

@router.get("/me", response_model=list[TeamListItemResponse])
async def get_my_teams(
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
    session: AsyncSession = Depends(get_session),
):
    """Lista todos os times do usuário logado."""
    user_repo = UserRepository(session)
    user = await user_repo.get_by_keycloak_id(str(current_user.keycloak_id))
    if not user:
        return []
    
    teams = await service.get_user_teams(str(current_user.keycloak_id))
    return [_build_team_list_item(t, user.id) for t in teams]


@router.get("/organization/{slug}", response_model=list[TeamResponse])
async def get_organization_teams(
    slug: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """Lista times de uma organização."""
    try:
        team_status = TeamStatus(status_filter) if status_filter else None
        teams = await service.get_organization_teams(slug, team_status)
        return [_build_team_response(t) for t in teams]
    except OrganizationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError:
        raise HTTPException(status_code=400, detail="Status inválido")


@router.get("/organization/{slug}/pending", response_model=list[TeamDetailResponse])
async def get_pending_teams(
    slug: str,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """
    Lista times pendentes de aprovação de uma organização (status READY).
    Apenas owner/organizer podem acessar.
    """
    try:
        teams = await service.get_pending_teams(slug, str(current_user.keycloak_id))
        return [_build_team_detail_response(t) for t in teams]
    except OrganizationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotTeamCaptainError:
        raise HTTPException(status_code=403, detail="Apenas organizadores podem ver times pendentes")


@router.get("/{team_id}", response_model=TeamDetailResponse)
async def get_team(
    team_id: UUID,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """Obtém detalhes de um time."""
    try:
        team = await service.get_team(team_id)
        return _build_team_detail_response(team)
    except TeamNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ==================== Convites ====================

@router.get("/{team_id}/invites", response_model=list[TeamInviteResponse])
async def list_team_invites(
    team_id: UUID,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """
    Lista convites do time.
    Apenas o capitão pode ver os convites.
    """
    try:
        invites = await service.get_team_invites(team_id, str(current_user.keycloak_id))
        return [_build_invite_response(invite) for invite in invites]
    except TeamNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotTeamCaptainError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/{team_id}/invites", response_model=TeamInviteResponse, status_code=status.HTTP_201_CREATED)
async def create_invite(
    team_id: UUID,
    data: CreateInviteRequest,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """
    Cria um convite para o time.
    Apenas o capitão pode criar convites.
    """
    try:
        invite = await service.create_invite(team_id, data, str(current_user.keycloak_id))
        return _build_invite_response(invite)
    except TeamNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotTeamCaptainError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except TeamStatusError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TeamFullError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invites/{token}/validate", response_model=InviteValidationResponse)
async def validate_invite(
    token: str,
    service: TeamService = Depends(get_team_service),
):
    """Valida um convite (sem autenticação, para preview)."""
    try:
        invite = await service.validate_invite(token)
        team = invite.team
        return InviteValidationResponse(
            valid=True,
            team_id=team.id,
            team_name=team.name,
            organization_name=team.organization.name if team.organization else None,
            competition_name=team.competition_name,
        )
    except (TeamInviteNotFoundError, TeamInviteExpiredError) as e:
        return InviteValidationResponse(
            valid=False,
            message=str(e),
        )


@router.post("/invites/{token}/accept", response_model=AcceptInviteResponse)
async def accept_invite(
    token: str,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """
    Aceita um convite para entrar no time.
    
    Se o usuário não for membro da organização, será adicionado automaticamente.
    """
    try:
        team, added_to_org = await service.accept_invite(token, str(current_user.keycloak_id))
        return AcceptInviteResponse(
            success=True,
            team_id=team.id,
            team_name=team.name,
            message="Você entrou no time com sucesso!",
            added_to_organization=added_to_org,
        )
    except TeamInviteNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TeamInviteExpiredError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AlreadyTeamMemberError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except TeamFullError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PlayerAlreadyInCompetitionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TeamStatusError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Gerenciamento de Membros ====================

@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    team_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """Remove um membro do time. Apenas o capitão pode remover."""
    try:
        await service.remove_member(team_id, user_id, str(current_user.keycloak_id))
    except TeamNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotTeamCaptainError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotTeamMemberError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{team_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_team(
    team_id: UUID,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """Sai do time. Capitão não pode sair."""
    try:
        await service.leave_team(team_id, str(current_user.keycloak_id))
    except TeamNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotTeamMemberError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotTeamCaptainError:
        raise HTTPException(
            status_code=400,
            detail="Capitão não pode sair do time. Transfira a capitania primeiro ou delete o time.",
        )


@router.post("/{team_id}/transfer-captaincy/{new_captain_id}", response_model=TeamDetailResponse)
async def transfer_captaincy(
    team_id: UUID,
    new_captain_id: UUID,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """Transfere a capitania para outro membro."""
    try:
        team = await service.transfer_captaincy(team_id, new_captain_id, str(current_user.keycloak_id))
        return _build_team_detail_response(team)
    except TeamNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotTeamCaptainError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotTeamMemberError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ==================== Aprovação ====================

@router.post("/{team_id}/request-approval", response_model=TeamDetailResponse)
async def request_approval(
    team_id: UUID,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """
    Solicita aprovação do time (apenas capitão).
    Muda o status do time para READY e aguarda aprovação de um organizador.
    """
    try:
        team = await service.request_approval(team_id, str(current_user.keycloak_id))
        return _build_team_detail_response(team)
    except TeamNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TeamAlreadyApprovedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TeamNotReadyError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TeamStatusError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotTeamCaptainError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/{team_id}/approve", response_model=TeamApprovalResponse)
async def approve_team(
    team_id: UUID,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """
    Aprova o time e envia para a competição.
    
    Apenas admin/organizer da organização pode aprovar.
    O time deve estar com status READY (após solicitação do capitão).
    """
    try:
        team, external_id = await service.approve_team(team_id, str(current_user.keycloak_id))
        return TeamApprovalResponse(
            success=True,
            team_id=team.id,
            external_team_id=external_id,
            message="Time aprovado e registrado na competição!",
        )
    except TeamNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TeamAlreadyApprovedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TeamNotReadyError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TeamStatusError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotTeamCaptainError as e:
        raise HTTPException(status_code=403, detail="Apenas organizadores podem aprovar times")
    except CompetitionServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/{team_id}/reject", response_model=TeamDetailResponse)
async def reject_team(
    team_id: UUID,
    data: TeamRejectionRequest,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """Rejeita um time (apenas admin/organizer)."""
    try:
        team = await service.reject_team(team_id, str(current_user.keycloak_id), data.reason)
        return _build_team_detail_response(team)
    except TeamNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TeamAlreadyApprovedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotTeamCaptainError:
        raise HTTPException(status_code=403, detail="Apenas organizadores podem rejeitar times")


# ==================== Deletar ====================

@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: UUID,
    current_user: User = Depends(get_current_db_user),
    service: TeamService = Depends(get_team_service),
):
    """
    Deleta um time.
    Apenas o capitão ou owner/organizer pode deletar.
    Não pode deletar time já aprovado.
    """
    try:
        await service.delete_team(team_id, str(current_user.keycloak_id))
    except TeamNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TeamAlreadyApprovedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotTeamCaptainError as e:
        raise HTTPException(status_code=403, detail=str(e))
