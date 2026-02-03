from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from src.routes.routes import get_session
from src.services.competitions_service import CompetitionService
from src.services.competition_generator.competition_generator import StructureGeneratorService
from src.schemas.competition_schema import (
    CompetitionCreate, 
    CompetitionResponse, 
    CompetitionUpdate,
    StatsRuleSetResponse,
    TeamWithPlayersResponse,
)

from pydantic import BaseModel, Field
from uuid import UUID

class GenerateStructureRequest(BaseModel):
    organization_id: UUID = Field(..., description="ID da organização")

router = APIRouter(prefix="/competitions", tags=["Competitions"])

@router.post(
    "/", 
    response_model=CompetitionResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Criar uma nova competição"
)
async def create_competition(
    data: CompetitionCreate, 
    session: AsyncSession = Depends(get_session)
):
    """
    Cria uma competição.
    
    - Você pode criar um **novo ruleset** enviando o objeto `ruleset`.
    - OU pode **reutilizar um ruleset** existente enviando `sport_ruleset_id`.
    """
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
    session: AsyncSession = Depends(get_session)
):
    service = CompetitionService(session)
    return await service.list_all(skip, limit)

@router.get(
    "/{competition_id}", 
    response_model=CompetitionResponse,
    summary="Obter detalhes de uma competição"
)
async def get_competition(
    competition_id: int, 
    session: AsyncSession = Depends(get_session)
):
    service = CompetitionService(session)
    return await service.get_by_id(competition_id)

@router.post(
    "/{competition_id}/generate-structure", 
    status_code=status.HTTP_200_OK
)
async def generate_structure(
    competition_id: int,
    request: GenerateStructureRequest,
    session: AsyncSession = Depends(get_session)
):
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
    competition_id: int,
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
    "/{competition_id}/teams-with-players",
    response_model=List[TeamWithPlayersResponse],
    summary="Obter times e jogadores da competição"
)
async def get_competition_teams_with_players(
    competition_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna todos os times da competição com seus respectivos jogadores.
    Útil para selecionar o jogador ao registrar uma estatística.
    """
    service = CompetitionService(session)
    return await service.get_teams_with_players(competition_id)