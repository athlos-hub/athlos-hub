from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from src.routes.routes import get_session
from src.services.competitions_service import CompetitionService
from src.services.competition_generator.competition_generator import StructureGeneratorService
from src.services.competition_generator.end_group_phase import EndGroupPhaseService
from src.services.auth_client import AuthClient, PermissionDenied, AuthServiceUnavailable
from src.schemas.competition_schema import (
    CompetitionCreate,
    CompetitionFinalizeResponse,
    CompetitionHighlightsResponse,
    CompetitionResponse,
    CompetitionUpdate,
    StatsRuleSetResponse,
    TeamWithPlayersResponse,
)
from src.services.competition_outcome_service import CompetitionOutcomeService
from src.services.competition_write_guard import ensure_competition_not_finished
from src.services.competition_achievements_service import CompetitionAchievementsService
from src.services.social_client import SocialServiceClient
from src.config.settings import settings
from src.schemas.stats_ruleset_schema import StatsTypeResponse
from src.schemas.competition_achievement_schema import (
    CompetitionAchievementDefinitionPatch,
    CompetitionAchievementDefinitionResponse,
    CompetitionAchievementAwardResponse,
)
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
    "/{competition_id}/highlights",
    response_model=CompetitionHighlightsResponse,
    summary="Campeão e destaques de estatísticas (competição finalizada)",
)
async def get_competition_highlights(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """
    Quando a competição está **finalizada**, retorna o time campeão (quando for possível inferir)
    e os top 3 jogadores por métrica configurada no conjunto de estatísticas.
    Para competições não finalizadas, retorna resposta vazia.
    """
    svc = CompetitionOutcomeService(session)
    return await svc.build_highlights(competition_id)


@router.get(
    "/{competition_id}/achievement-definitions",
    response_model=List[CompetitionAchievementDefinitionResponse],
    summary="Listar conquistas configuradas da competição",
)
async def get_competition_achievement_definitions(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    svc = CompetitionAchievementsService(session, SocialServiceClient(settings.SOCIAL_SERVICE_URL))
    # Alinha definições com as métricas atuais (idempotente; corrige cargas antigas sem sync).
    await svc.sync_definitions_for_competition(competition_id)
    return await svc.list_definitions(competition_id)


@router.patch(
    "/{competition_id}/achievement-definitions/{definition_id}",
    response_model=CompetitionAchievementDefinitionResponse,
    summary="Atualizar nome exibido da conquista (ou restaurar título automático)",
)
async def patch_competition_achievement_definition(
    competition_id: UUID,
    definition_id: UUID,
    data: CompetitionAchievementDefinitionPatch,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id),
):
    service = CompetitionService(session)
    competition = await service.get_by_id(competition_id)
    await ensure_competition_not_finished(session, competition_id)
    organization_slug = await _get_organization_slug_from_modality(session, competition.modality_id)
    await _verify_user_permission(current_keycloak_id, organization_slug)
    svc = CompetitionAchievementsService(session, SocialServiceClient(settings.SOCIAL_SERVICE_URL))
    return await svc.patch_definition(competition_id, definition_id, data)


@router.get(
    "/{competition_id}/achievement-awards",
    response_model=List[CompetitionAchievementAwardResponse],
    summary="Listar conquistas concedidas da competição",
)
async def get_competition_achievement_awards(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    svc = CompetitionAchievementsService(session, SocialServiceClient(settings.SOCIAL_SERVICE_URL))
    return await svc.list_awards(competition_id)


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
    await ensure_competition_not_finished(session, competition_id)

    # Buscar organization_slug da modalidade
    organization_slug = await _get_organization_slug_from_modality(session, competition.modality_id)
    
    # Verificar permissão do usuário
    await _verify_user_permission(current_keycloak_id, organization_slug)
    
    service = StructureGeneratorService(session)
    return await service.generate_structure(
        competition_id=competition_id,
        organization_id=request.organization_id
    )


@router.post(
    "/{competition_id}/advance-group-phase",
    status_code=status.HTTP_200_OK,
    summary="Avançar da fase de grupos para eliminação (apenas MIXED)"
)
async def advance_group_phase(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Finaliza a fase de grupos e popula a árvore eliminatória com os times classificados.
    
    - Requer que **todos** os jogos da fase de grupos estejam FINISHED
    - Seleciona os top N times de cada grupo (conforme configurado)
    - Cria cruzamentos inteligentes (cabeças de chave vs potes baixos)
    - Atualiza matches vazios (placeholders) da fase final com os times reais
    - Transição: current_phase muda de GROUPS para ELIMINATION
    
    **Requer autenticação**: Apenas OWNER ou ORGANIZER da organização podem executar esta ação.
    
    **Apenas para competições MIXED** com 2 fases.
    """
    # Buscar a competição para obter a modalidade
    competition_service = CompetitionService(session)
    competition = await competition_service.get_by_id(competition_id)
    await ensure_competition_not_finished(session, competition_id)

    # Buscar organization_slug da modalidade
    organization_slug = await _get_organization_slug_from_modality(session, competition.modality_id)
    
    # Verificar permissão do usuário
    await _verify_user_permission(current_keycloak_id, organization_slug)
    
    service = EndGroupPhaseService(session)
    return await service.advance_group_phase(competition_id)


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
    response_model=CompetitionFinalizeResponse,
    status_code=status.HTTP_200_OK,
    summary="Finalizar competição e verificar conquistas"
)
async def finalize_competition(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id),
):
    """
    Finaliza uma competição e verifica todas as conquistas.
    
    - Atualiza status para 'finished'
    - Verifica conquistas de campeão, vice, artilheiro, melhor defesa, etc.
    - Notifica o social-service sobre as conquistas
    """
    service = CompetitionService(session)
    competition = await service.get_by_id(competition_id)
    organization_slug = await _get_organization_slug_from_modality(session, competition.modality_id)
    await _verify_user_permission(current_keycloak_id, organization_slug)
    summary = await service.finalize_competition(competition_id)
    refreshed = await service.get_by_id(competition_id)
    return CompetitionFinalizeResponse(
        competition=CompetitionResponse.model_validate(refreshed),
        achievements_checked=summary["achievements_checked"],
        player_achievements_awarded=summary["player_achievements_awarded"],
        message=summary["message"],
    )
