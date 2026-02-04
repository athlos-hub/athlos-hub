from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from .routes import get_session
from src.models.teams import TeamModel
from src.schemas.teams_schema import TeamCreateSchema, TeamResponseSchema
from src.services.teams_service import TeamService
from src.services.auth_client import AuthClient, PermissionDenied, AuthServiceUnavailable
from src.api.deps import get_current_keycloak_id

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
