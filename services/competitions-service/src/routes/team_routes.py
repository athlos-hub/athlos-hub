from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from src.schemas.teams_schema import (
    TeamCreateSchema, 
    TeamResponseSchema,
    CreateInviteRequest,
    InviteResponseSchema,
    AcceptInviteRequest,
    AcceptInviteResponse,
    InviteValidationResponse,
    TeamListItemSchema,
    TeamDetailSchema,
)
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid

from .routes import get_session, get_current_user
from src.models.teams import TeamModel, PlayerModel
from src.services.teams_service import TeamService
from src.services.auth_client import AuthClient, PermissionDenied, AuthServiceUnavailable
from src.api.deps import get_current_keycloak_id, get_optional_keycloak_id
from src.config.settings import settings

router = APIRouter(prefix="/teams", tags=["teams"])


async def _verify_user_permission(keycloak_id: UUID, organization_slug: str):
    """
    Verifica se o usuário tem permissão de OWNER ou ORGANIZER na organização.
    Lança HTTPException se não tiver permissão.
    """
    try:
        async with AuthClient() as auth_client:
            await auth_client.check_user_permission(
                keycloak_id=keycloak_id,
                organization_slug=organization_slug,
                allowed_roles=["OWNER", "ORGANIZER"]
            )
    except PermissionDenied as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Você não tem permissão para realizar esta ação nesta organização. Role atual: {e.role}"
        )
    except AuthServiceUnavailable:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de autenticação indisponível"
        )


@router.post("/", response_model=TeamResponseSchema)
async def create_team(
    team_data: TeamCreateSchema, 
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Cria um novo time para uma competição.
    
    **Requer autenticação**: Apenas OWNER ou ORGANIZER da organização podem criar times.
    """
    # Verificar permissão do usuário
    await _verify_user_permission(current_keycloak_id, team_data.organization_slug)
    
    team_service = TeamService(session)
    team = await team_service.create_team(team_data)

    return team


@router.get(
    "/me",
    response_model=List[TeamListItemSchema],
    summary="Listar times do usuário"
)
async def get_my_teams(
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Lista todos os times do usuário autenticado.
    
    Retorna times onde o usuário é jogador ou capitão.
    """
    team_service = TeamService(session)
    teams = await team_service.get_user_teams(current_keycloak_id)
    return teams


@router.get(
    "/{team_id}",
    response_model=TeamDetailSchema,
    summary="Obter detalhes de um time"
)
async def get_team_detail(
    team_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: Optional[UUID] = Depends(get_optional_keycloak_id)
):
    """
    Obtém os detalhes de um time específico.
    
    Se o usuário estiver autenticado e fizer parte do time,
    retorna também a role (CAPTAIN ou PLAYER).
    """
    team_service = TeamService(session)
    team = await team_service.get_team_detail(team_id, current_keycloak_id)
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time não encontrado"
        )
    
    return team


# ==================== Rotas de Convite ====================

def _build_invite_url(request: Request, invite_token: str) -> str:
    """Constrói a URL completa do convite."""
    # Em produção, usar a URL do frontend
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    return f"{frontend_url}/convite/{invite_token}"


@router.post(
    "/{team_id}/invites",
    response_model=InviteResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Gerar link de convite para o time"
)
async def create_team_invite(
    team_id: UUID,
    request: Request,
    invite_data: CreateInviteRequest = CreateInviteRequest(),
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Gera um link de convite para o time.
    
    **Requer autenticação**: Apenas o **capitão** do time pode gerar convites.
    
    O convite pode ser configurado com:
    - `expires_in_days`: Dias até expirar (1-30, padrão: 7)
    - `max_uses`: Número máximo de usos (null = ilimitado)
    """
    team_service = TeamService(session)
    invite = await team_service.generate_invite(
        team_id=team_id,
        created_by_keycloak_id=current_keycloak_id,
        expires_in_days=invite_data.expires_in_days,
        max_uses=invite_data.max_uses
    )
    
    # Construir a URL do convite
    invite_url = _build_invite_url(request, invite.invite_token)
    
    return InviteResponseSchema(
        id=invite.id,
        team_id=invite.team_id,
        invite_token=invite.invite_token,
        invite_url=invite_url,
        created_by=invite.created_by,
        status=invite.status.value,
        expires_at=invite.expires_at,
        max_uses=invite.max_uses,
        use_count=invite.use_count,
        created_at=invite.created_at
    )


@router.get(
    "/{team_id}/invites",
    response_model=List[InviteResponseSchema],
    summary="Listar convites do time"
)
async def list_team_invites(
    team_id: UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Lista todos os convites de um time.
    
    **Requer autenticação**: Apenas o **capitão** do time pode ver os convites.
    """
    team_service = TeamService(session)
    invites = await team_service.list_team_invites(team_id, current_keycloak_id)
    
    return [
        InviteResponseSchema(
            id=inv.id,
            team_id=inv.team_id,
            invite_token=inv.invite_token,
            invite_url=_build_invite_url(request, inv.invite_token),
            created_by=inv.created_by,
            status=inv.status.value,
            expires_at=inv.expires_at,
            max_uses=inv.max_uses,
            use_count=inv.use_count,
            created_at=inv.created_at
        )
        for inv in invites
    ]


@router.delete(
    "/{team_id}/invites/{invite_token}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revogar um convite"
)
async def revoke_team_invite(
    team_id: UUID,
    invite_token: str,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Revoga um convite de time.
    
    **Requer autenticação**: Apenas o **capitão** do time pode revogar convites.
    """
    team_service = TeamService(session)
    await team_service.revoke_invite(invite_token, current_keycloak_id)


@router.get(
    "/invites/{invite_token}/validate",
    response_model=InviteValidationResponse,
    summary="Validar um convite (preview)"
)
async def validate_invite(
    invite_token: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Valida um convite e retorna informações sobre o time.
    
    **Não requer autenticação**: Usado para mostrar preview do convite antes de aceitar.
    
    Retorna informações como:
    - Nome do time e competição
    - Se o convite é válido
    - Quando expira
    - Quantos usos restam
    """
    team_service = TeamService(session)
    result = await team_service.validate_invite(invite_token)
    
    return InviteValidationResponse(**result)


@router.post(
    "/invites/{invite_token}/accept",
    response_model=AcceptInviteResponse,
    summary="Aceitar um convite"
)
async def accept_invite(
    invite_token: str,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Aceita um convite e entra no time.
    
    **Requer autenticação**: O usuário deve estar logado.
    
    Validações realizadas:
    - Usuário é membro da organização
    - Usuário não está em outro time da mesma competição
    - Convite ainda é válido (não expirado, não revogado)
    - Time ainda tem vagas
    - Competição ainda aceita inscrições
    """
    team_service = TeamService(session)
    result = await team_service.accept_invite(invite_token, current_keycloak_id)
    
    return AcceptInviteResponse(**result)