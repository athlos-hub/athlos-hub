from http.client import HTTPException
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
from uuid import UUID

from src.routes.routes import get_session
from src.services.matches_service import MatchesService
from src.schemas.matches_schema import MatchOrgResponse, MatchPeriodFilter, MatchResponse, MatchUpdateRequest, MatchDetailResponse, MultipleMatchesDetailResponse
from src.schemas.matches_schema import (
    MatchOrgResponse,
    MatchPeriodFilter,
    MatchResponse,
    MatchUpdateRequest,
    ScoreUpdateRequest,
    SetScoreRequest,
)
from src.services.manege_matches_service import ManageMatchesService
from src.services.rounds_service import RoundsService
from src.schemas.rounds_schema import RoundMatchesResponse
from src.models.matches import MatchModel
from src.models.competition import CompetitionModel
from src.models.modality import ModalityModel
from src.services.auth_client import AuthClient, PermissionDenied, AuthServiceUnavailable
from src.api.deps import get_current_keycloak_id

router = APIRouter(prefix="/matches", tags=["matches"])


async def _get_organization_slug_from_match(session: AsyncSession, match_id: uuid.UUID) -> str:
    """
    Busca o organization_slug a partir da partida (match -> competition -> modality).
    """
    result = await session.execute(
        select(ModalityModel.organization_slug)
        .join(CompetitionModel, CompetitionModel.modality_id == ModalityModel.id)
        .join(MatchModel, MatchModel.competition_id == CompetitionModel.id)
        .where(MatchModel.id == match_id)
    )
    org_slug = result.scalar_one_or_none()
    
    if not org_slug:
        raise HTTPException(
            status_code=404,
            detail=f"Partida com id {match_id} não encontrada"
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
            status_code=403,
            detail=f"Você não tem permissão para realizar esta ação nesta organização. Role atual: {e.role}"
        )
    except AuthServiceUnavailable:
        raise HTTPException(
            status_code=503,
            detail="Serviço de autenticação indisponível"
        )

@router.get(
    "/organization/{organization_slug}", 
    response_model=List[MatchOrgResponse],
    summary="Listar jogos de uma organização com filtros"
)
async def list_organization_matches(
    organization_slug: str,
    period: MatchPeriodFilter = Query(
        MatchPeriodFilter.ALL, 
        description="Filtro de período: 'today', 'week', ou 'all'"
    ),
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna todos os jogos de todas as competições e modalidades vinculadas
    a um slug de organização (organization_slug).
    """
    service = MatchesService(session)
    return await service.get_matches_by_org(organization_slug, period)

@router.get(
    "/competition/{competition_id}",
    response_model=List[MatchResponse],
    summary="Listar jogos de uma competição com filtros"
)
async def list_competition_matches(
    competition_id: int,
    period: MatchPeriodFilter = Query(
        MatchPeriodFilter.ALL, 
        description="Filtro de período: 'today', 'week', ou 'all'"
    ),
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna a lista de jogos de uma competição específica.
    Permite filtrar por jogos de hoje ou da semana atual.
    """
    service = MatchesService(session)
    return await service.get_matches_by_competition(competition_id, period)


@router.get(
    "/team/{team_id}/", 
    response_model=List[MatchOrgResponse],
    summary="Listar jogos de um time específico"
)
async def list_team_matches(
    team_id: uuid.UUID,
    period: MatchPeriodFilter = Query(
        MatchPeriodFilter.ALL, 
        description="Filtro de período: 'today', 'week', ou 'all'"
    ),
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna todos os jogos onde o time atua como mandante ou visitante.
    """
    service = MatchesService(session)
    return await service.get_matches_by_team(team_id, period)

@router.get(
    "/competition/{competition_id}/rounds",
    response_model=List[RoundMatchesResponse],
    summary="Listar rodadas e jogos da competição"
)
async def list_competition_rounds(
    competition_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna todas as rodadas da competição, com seus jogos agrupados dentro.
    """
    service = RoundsService(session)
    return await service.get_rounds_by_competition(competition_id)

@router.get(
    "/group/{group_id}/rounds",
    response_model=List[RoundMatchesResponse],
    summary="Listar rodadas e jogos de um grupo"
)
async def list_group_rounds(
    group_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna as rodadas pertencentes a um grupo específico (ex: Grupo A),
    com a lista de jogos de cada rodada.
    """
    service = RoundsService(session)
    return await service.get_rounds_by_group(group_id)

@router.get(
    "/organization/{organization_slug}/rounds",
    response_model=List[RoundMatchesResponse],
    summary="Listar todas as rodadas de uma organização"
)
async def list_org_rounds(
    organization_slug: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna todas as rodadas (e seus respectivos jogos) de todas as competições
    vinculadas ao slug da organização (organization_slug).
    """
    service = RoundsService(session)
    return await service.get_rounds_by_org(organization_slug)

@router.patch(
    "/{match_id}",
    response_model=MatchResponse, # Retorna o objeto atualizado
    summary="Atualizar Data, Hora e Local do Jogo"
)
async def update_match(
    match_id: str, 
    update_data: MatchUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Permite alterar o agendamento de uma partida.
    - Valida se a data é futura.
    - Atualiza status para SCHEDULED se necessário.
    
    **Requer autenticação**: Apenas OWNER ou ORGANIZER da organização podem atualizar jogos.
    """
  
    try:
        match_uuid = uuid.UUID(match_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de jogo inválido.")

    # Verificar permissão do usuário
    organization_slug = await _get_organization_slug_from_match(session, match_uuid)
    await _verify_user_permission(current_keycloak_id, organization_slug)

    service = MatchesService(session)
    return await service.update_match_details(match_uuid, update_data)

@router.get(
    "/{match_id}",
    response_model=MatchDetailResponse,
    summary="Obter detalhes de uma partida específica"
)
async def get_match_by_id(
    match_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna os detalhes completos de uma partida incluindo:
    - Informações dos times (nome, logo)
    - Data/hora agendada
    - Local
    - Status
    - Placar
    - Rodada/Grupo
    - Competição
    """
    try:
        match_uuid = uuid.UUID(match_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de jogo inválido.")
    
    service = MatchesService(session)
    return await service.get_match_details_by_id(match_uuid)


@router.post(
    "/batch",
    response_model=MultipleMatchesDetailResponse,
    summary="Obter detalhes de múltiplas partidas"
)
async def get_matches_by_ids(
    match_ids: List[str],
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna os detalhes de múltiplas partidas de uma só vez.
    Otimizado para reduzir chamadas quando se tem várias lives.
    """
    try:
        match_uuids = [uuid.UUID(mid) for mid in match_ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="Um ou mais IDs de jogo são inválidos.")
    
    service = MatchesService(session)
    matches = await service.get_matches_details_by_ids(match_uuids)
    return MultipleMatchesDetailResponse(matches=matches)

@router.post(
    "/{match_id}/score",
    response_model=MatchResponse,
    summary="Registrar pontuação (segmentada ou geral)"
)
async def register_match_score(
    match_id: uuid.UUID,
    score: ScoreUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Registra pontuação em um jogo:
    - Se `segment_id` for informado, incrementa no segmento e reflete no total do jogo.
    - Caso contrário, incrementa diretamente no placar geral.
    - Se a competição possuir StatsRuleSet, exige `player_id` e `stats_metric_abbreviation`.
    - Só permite incrementar com o jogo no status `live`.
    
    **Requer autenticação**: Apenas OWNER ou ORGANIZER da organização podem registrar pontuação.
    """
    # Verificar permissão do usuário
    organization_slug = await _get_organization_slug_from_match(session, match_id)
    await _verify_user_permission(current_keycloak_id, organization_slug)
    
    service = ManageMatchesService(session)
    updated = await service.register_score(
        match_id=match_id,
        team_side=score.team_side.value,
        increment=score.increment,
        segment_id=score.segment_id,
        stats_metric_abbreviation=score.stats_metric_abbreviation,
        player_id=score.player_id,
    )
    return updated


@router.post(
    "/{match_id}/set-score",
    response_model=MatchResponse,
    summary="Setar placar específico (com segments e stats)"
)
async def set_match_score(
    match_id: uuid.UUID,
    payload: SetScoreRequest,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Seta placar específico de um jogo:
    - Se `segments` for fornecido, atualiza os segmentos e recalcula o total do jogo.
    - Caso contrário, seta diretamente `home_score` e `away_score`.
    - Se houver `stats_events`, valida ruleset e incrementa PlayerStats.
    - Só permite alteração com o jogo no status `live`.
    
    **Requer autenticação**: Apenas OWNER ou ORGANIZER da organização podem setar placar.
    """
    # Verificar permissão do usuário
    organization_slug = await _get_organization_slug_from_match(session, match_id)
    await _verify_user_permission(current_keycloak_id, organization_slug)
    
    service = ManageMatchesService(session)
    updated = await service.set_score(
        match_id=match_id,
        home_score=payload.home_score,
        away_score=payload.away_score,
        segments=[{"segment_id": s.segment_id, "home_score": s.home_score, "away_score": s.away_score} for s in (payload.segments or [])],
        stats_events=[{"player_id": e.player_id, "abbreviation": e.abbreviation, "value": e.value} for e in (payload.stats_events or [])],
    )
    return updated

@router.post(
    "/{match_id}/finish",
    response_model=MatchResponse,
    summary="Finalizar jogo"
)
async def finish_match(
    match_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id)
):
    """
    Finaliza um jogo que está em andamento:
    - Atualiza status para 'finished'.
    - Garante que o placar final esteja definido.
    - Dispara atualizações relacionadas (classificações, estatísticas, etc).
    
    **Requer autenticação**: Apenas OWNER ou ORGANIZER da organização podem finalizar jogos.
    """
    # Verificar permissão do usuário
    organization_slug = await _get_organization_slug_from_match(session, match_id)
    await _verify_user_permission(current_keycloak_id, organization_slug)
    
    service = ManageMatchesService(session)
    finished_match = await service.finalize_match(match_id)
    return finished_match