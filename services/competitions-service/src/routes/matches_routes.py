from http.client import HTTPException
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from src.routes.routes import get_session
from src.services.matches_service import MatchesService
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

router = APIRouter(prefix="/matches", tags=["matches"])

@router.get(
    "/organization/{org_code}", 
    response_model=List[MatchOrgResponse],
    summary="Listar jogos de uma organização com filtros"
)
async def list_organization_matches(
    org_code: str,
    period: MatchPeriodFilter = Query(
        MatchPeriodFilter.ALL, 
        description="Filtro de período: 'today', 'week', ou 'all'"
    ),
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna todos os jogos de todas as competições e modalidades vinculadas
    a um código de organização (org_code).
    """
    service = MatchesService(session)
    return await service.get_matches_by_org(org_code, period)

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
    "/organization/{org_code}/rounds",
    response_model=List[RoundMatchesResponse],
    summary="Listar todas as rodadas de uma organização"
)
async def list_org_rounds(
    org_code: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna todas as rodadas (e seus respectivos jogos) de todas as competições
    vinculadas ao código da organização (org_code).
    """
    service = RoundsService(session)
    return await service.get_rounds_by_org(org_code)

@router.patch(
    "/{match_id}",
    response_model=MatchResponse, # Retorna o objeto atualizado
    summary="Atualizar Data, Hora e Local do Jogo"
)
async def update_match(
    match_id: str, 
    update_data: MatchUpdateRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Permite alterar o agendamento de uma partida.
    - Valida se a data é futura.
    - Atualiza status para SCHEDULED se necessário.
    """
  
    try:
        match_uuid = uuid.UUID(match_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de jogo inválido.")

    service = MatchesService(session)
    return await service.update_match_details(match_uuid, update_data)


@router.post(
    "/{match_id}/score",
    response_model=MatchResponse,
    summary="Registrar pontuação (segmentada ou geral)"
)
async def register_match_score(
    match_id: uuid.UUID,
    score: ScoreUpdateRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Registra pontuação em um jogo:
    - Se `segment_id` for informado, incrementa no segmento e reflete no total do jogo.
    - Caso contrário, incrementa diretamente no placar geral.
    - Se a competição possuir StatsRuleSet, exige `player_id` e `stats_metric_abbreviation`.
    - Só permite incrementar com o jogo no status `live`.
    """
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
    session: AsyncSession = Depends(get_session)
):
    """
    Seta placar específico de um jogo:
    - Se `segments` for fornecido, atualiza os segmentos e recalcula o total do jogo.
    - Caso contrário, seta diretamente `home_score` e `away_score`.
    - Se houver `stats_events`, valida ruleset e incrementa PlayerStats.
    - Só permite alteração com o jogo no status `live`.
    """
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
    session: AsyncSession = Depends(get_session)
):
    """
    Finaliza um jogo que está em andamento:
    - Atualiza status para 'finished'.
    - Garante que o placar final esteja definido.
    - Dispara atualizações relacionadas (classificações, estatísticas, etc).
    """
    service = ManageMatchesService(session)
    finished_match = await service.finalize_match(match_id)
    return finished_match