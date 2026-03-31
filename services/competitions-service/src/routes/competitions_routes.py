from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from src.routes.routes import get_session
from src.services.competitions_service import CompetitionService
from src.services.competition_generator.competition_generator import StructureGeneratorService
from src.services.auth_client import AuthClient, PermissionDenied, AuthServiceUnavailable
from src.schemas.competition_schema import (
    CompetitionCreate, 
    CompetitionResponse, 
    CompetitionUpdate,
    StatsRuleSetResponse,
    TeamWithPlayersResponse,
)
from src.schemas.stats_ruleset_schema import StatsTypeResponse
from src.models.modality import ModalityModel
from src.api.deps import get_current_keycloak_id

from pydantic import BaseModel, Field


class GenerateStructureRequest(BaseModel):
    organization_id: UUID = Field(..., description="ID da organização")

router = APIRouter(prefix="/competitions", tags=["Competitions"])


async def _get_organization_slug_from_modality(session: AsyncSession, modality_id: UUID) -> str:
    """
    Busca o organization_slug a partir da modalidade.
    Lança HTTPException 404 se a modalidade não existir.
    """
    result = await session.execute(
        select(ModalityModel.organization_slug).where(ModalityModel.id == modality_id)
    )
    org_slug = result.scalar_one_or_none()
    
    if not org_slug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modalidade com id {modality_id} não encontrada"
        )
    
    return org_slug


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


@router.post(
    "/", 
    response_model=CompetitionResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Criar uma nova competição"
)
async def create_competition(
    data: CompetitionCreate, 
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Cria uma competição.
    
    - Você pode criar um **novo ruleset** enviando o objeto `ruleset`.
    - OU pode **reutilizar um ruleset** existente enviando `sport_ruleset_id`.
    
    **Requer autenticação**: Apenas OWNER ou ORGANIZER da organização podem criar competições.
    """
    # Buscar organization_slug da modalidade
    organization_slug = await _get_organization_slug_from_modality(session, data.modality_id)
    
    # Verificar permissão do usuário
    await _verify_user_permission(current_keycloak_id, organization_slug)
    
    service = CompetitionService(session)
    return await service.create(data)

@router.get(
    "/", 
    response_model=List[CompetitionResponse],
    summary="Listar competições"
)
async def list_competitions(
    skip: int = 0, 
    limit: int = 100,
    organization_slug: Optional[str] = None,
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    Lista competições (público).
    
    Se organization_slug for fornecido, retorna apenas as competições 
    da organização (via modalidade).
    Se status for fornecido, filtra pelo status da competição.
    Caso contrário, retorna todas as competições.
    """
    service = CompetitionService(session)
    return await service.list_all(skip, limit, organization_slug=organization_slug, status=status)

@router.get(
    "/{competition_id}", 
    response_model=CompetitionResponse,
    summary="Obter detalhes de uma competição"
)
async def get_competition(
    competition_id: UUID, 
    session: AsyncSession = Depends(get_session)
):
    service = CompetitionService(session)
    return await service.get_by_id(competition_id)


@router.put(
    "/{competition_id}",
    response_model=CompetitionResponse,
    summary="Atualizar competição",
)
async def update_competition(
    competition_id: UUID,
    data: CompetitionUpdate,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id),
):
    service = CompetitionService(session)
    competition = await service.get_by_id(competition_id)
    organization_slug = await _get_organization_slug_from_modality(session, competition.modality_id)
    await _verify_user_permission(current_keycloak_id, organization_slug)
    return await service.update(competition_id, data)


@router.delete(
    "/{competition_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir competição",
)
async def delete_competition(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id),
):
    service = CompetitionService(session)
    competition = await service.get_by_id(competition_id)
    organization_slug = await _get_organization_slug_from_modality(session, competition.modality_id)
    await _verify_user_permission(current_keycloak_id, organization_slug)
    await service.delete(competition_id)

@router.post(
    "/{competition_id}/generate-structure", 
    status_code=status.HTTP_200_OK
)
async def generate_structure(
    competition_id: UUID,
    request: GenerateStructureRequest,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Gera a estrutura de grupos e partidas para a competição.
    
    **Requer autenticação**: Apenas OWNER ou ORGANIZER da organização podem gerar estrutura.
    """
    # Buscar a competição para obter a modalidade
    competition_service = CompetitionService(session)
    competition = await competition_service.get_by_id(competition_id)
    
    # Buscar organization_slug da modalidade
    organization_slug = await _get_organization_slug_from_modality(session, competition.modality_id)
    
    # Verificar permissão do usuário
    await _verify_user_permission(current_keycloak_id, organization_slug)
    
    service = StructureGeneratorService(session)
    return await service.generate_structure(
        competition_id=competition_id,
        organization_id=request.organization_id
    )


@router.get(
    "/{competition_id}/stats-ruleset",
    response_model=Optional[StatsRuleSetResponse],
    summary="Obter regras de estatísticas da competição"
)
async def get_competition_stats_ruleset(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna o conjunto de regras de estatísticas (StatsRuleSet) da competição,
    incluindo os tipos de métricas disponíveis (gols, assistências, pontos, etc).
    Retorna null se a competição não tiver stats configurados.
    """
    service = CompetitionService(session)
    return await service.get_stats_ruleset(competition_id)


@router.get(
    "/{competition_id}/stats",
    response_model=List[StatsTypeResponse],
    summary="Obter tipos de estatísticas da competição"
)
async def get_competition_stats(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna apenas os tipos de estatísticas (StatsTypes) da competição.
    Retorna lista vazia se a competição não tiver stats configurados.
    """
    service = CompetitionService(session)
    stats_ruleset = await service.get_stats_ruleset(competition_id)
    
    if not stats_ruleset:
        return []
    
    return stats_ruleset.stats_types


@router.get(
    "/{competition_id}/teams-with-players",
    response_model=List[TeamWithPlayersResponse],
    summary="Obter times e jogadores da competição"
)
async def get_competition_teams_with_players(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna todos os times da competição com seus respectivos jogadores.
    Útil para selecionar o jogador ao registrar uma estatística.
    """
    service = CompetitionService(session)
    return await service.get_teams_with_players(competition_id)


@router.post(
    "/{competition_id}/finalize",
    status_code=status.HTTP_200_OK,
    summary="Finalizar competição e verificar conquistas"
)
async def finalize_competition(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """
    Finaliza uma competição e verifica todas as conquistas.
    
    - Atualiza status para 'finished'
    - Verifica conquistas de campeão, vice, artilheiro, melhor defesa, etc.
    - Notifica o social-service sobre as conquistas
    """
    service = CompetitionService(session)
    return await service.finalize_competition(competition_id)
