from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from src.routes.routes import get_session
from src.services.stats_ruleset_service import StatsRuleSetService
from src.schemas.stats_ruleset_schema import (
    StatsRuleSetCreate,
    StatsRuleSetUpdate,
    StatsRuleSetResponse,
    StatsTypeCreate,
    StatsTypeUpdate,
    StatsTypeResponse
)


router = APIRouter(prefix="/stats-rulesets", tags=["Stats Rulesets"])


@router.post(
    "/competition/{competition_id}",
    response_model=StatsRuleSetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar Stats Ruleset para uma competição"
)
async def create_stats_ruleset(
    competition_id: UUID,
    data: StatsRuleSetCreate,
    session: AsyncSession = Depends(get_session)
):
    """
    Cria um novo conjunto de estatísticas para uma competição específica.
    
    - Uma competição só pode ter UM stats ruleset
    - Você pode criar os tipos de estatísticas junto (stats_types)
    """
    service = StatsRuleSetService(session)
    return await service.create(competition_id, data)


@router.get(
    "/competition/{competition_id}",
    response_model=StatsRuleSetResponse,
    summary="Obter Stats Ruleset de uma competição"
)
async def get_competition_stats_ruleset(
    competition_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna o conjunto de estatísticas de uma competição.
    """
    service = StatsRuleSetService(session)
    result = await service.get_by_competition(competition_id)
    
    if not result:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competição {competition_id} não possui stats ruleset configurado"
        )
    
    return result


@router.get(
    "/{ruleset_id}",
    response_model=StatsRuleSetResponse,
    summary="Obter Stats Ruleset por ID"
)
async def get_stats_ruleset(
    ruleset_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna um stats ruleset específico pelo ID.
    """
    service = StatsRuleSetService(session)
    return await service.get_by_id(ruleset_id)


@router.get(
    "/",
    response_model=List[StatsRuleSetResponse],
    summary="Listar todos os Stats Rulesets"
)
async def list_stats_rulesets(
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session)
):
    """
    Lista todos os conjuntos de estatísticas cadastrados.
    """
    service = StatsRuleSetService(session)
    return await service.list_all(skip, limit)


@router.patch(
    "/{ruleset_id}",
    response_model=StatsRuleSetResponse,
    summary="Atualizar Stats Ruleset"
)
async def update_stats_ruleset(
    ruleset_id: UUID,
    data: StatsRuleSetUpdate,
    session: AsyncSession = Depends(get_session)
):
    """
    Atualiza informações básicas do stats ruleset (nome, descrição).
    """
    service = StatsRuleSetService(session)
    return await service.update(ruleset_id, data)


@router.delete(
    "/{ruleset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar Stats Ruleset"
)
async def delete_stats_ruleset(
    ruleset_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """
    Deleta um stats ruleset e todos os tipos de estatísticas associados.
    """
    service = StatsRuleSetService(session)
    await service.delete(ruleset_id)


# Endpoints para gerenciar StatsTypes individuais

@router.post(
    "/{ruleset_id}/stats",
    response_model=StatsTypeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar tipo de estatística ao ruleset"
)
async def add_stat_type(
    ruleset_id: UUID,
    data: StatsTypeCreate,
    session: AsyncSession = Depends(get_session)
):
    """
    Adiciona um novo tipo de estatística a um ruleset existente.
    """
    service = StatsRuleSetService(session)
    return await service.add_stat_type(ruleset_id, data)


@router.patch(
    "/{ruleset_id}/stats/{stat_type_id}",
    response_model=StatsTypeResponse,
    summary="Atualizar tipo de estatística"
)
async def update_stat_type(
    ruleset_id: UUID,
    stat_type_id: UUID,
    data: StatsTypeUpdate,
    session: AsyncSession = Depends(get_session)
):
    """
    Atualiza um tipo de estatística específico.
    """
    service = StatsRuleSetService(session)
    return await service.update_stat_type(ruleset_id, stat_type_id, data)


@router.delete(
    "/{ruleset_id}/stats/{stat_type_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar tipo de estatística"
)
async def delete_stat_type(
    ruleset_id: UUID,
    stat_type_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """
    Remove um tipo de estatística de um ruleset.
    """
    service = StatsRuleSetService(session)
    await service.delete_stat_type(ruleset_id, stat_type_id)
