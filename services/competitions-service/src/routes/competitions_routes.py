from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

# Ajuste o import do db conforme sua estrutura (src.core.client ou src.dependencies)
from src.routes.routes import get_session
from src.services.competitions_service import CompetitionService
from src.services.competition_generator import StructureGeneratorService
from src.schemas.competition_schema import (
    CompetitionCreate, 
    CompetitionResponse, 
    CompetitionUpdate
)

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
    session: AsyncSession = Depends(get_session)
):
    """
    Gera Rounds, Matches, Segments e Standings iniciais.
    Muda o status da competição para ACTIVE.
    """
    service = StructureGeneratorService(session)
    return await service.generate_structure(competition_id)