from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from src.routes.routes import get_session
from src.services.sport_ruleset_service import SportRulesetService
from src.schemas.sport_ruleset_schema import (
    SportRulesetCreate,
    SportRulesetUpdate,
    SportRulesetResponse
)


router = APIRouter(prefix="/sport-rulesets", tags=["Sport Rulesets"])


@router.post(
    "/",
    response_model=SportRulesetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar Sport Ruleset"
)
async def create_sport_ruleset(
    data: SportRulesetCreate,
    session: AsyncSession = Depends(get_session)
):
    """
    Cria um novo conjunto de regras esportivas.
    
    Esse ruleset pode ser reutilizado em múltiplas competições.
    Define estrutura de tempos/sets, prorrogações, pênaltis, etc.
    """
    service = SportRulesetService(session)
    return await service.create(data)


@router.get(
    "/{ruleset_id}",
    response_model=SportRulesetResponse,
    summary="Obter Sport Ruleset por ID"
)
async def get_sport_ruleset(
    ruleset_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna um sport ruleset específico pelo ID.
    """
    service = SportRulesetService(session)
    return await service.get_by_id(ruleset_id)


@router.get(
    "/",
    response_model=List[SportRulesetResponse],
    summary="Listar todos os Sport Rulesets"
)
async def list_sport_rulesets(
    skip: int = 0,
    limit: int = 100,
    organization_slug: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    Lista conjuntos de regras esportivas cadastrados.
    Use organization_slug para listar apenas os da organização.
    """
    service = SportRulesetService(session)
    return await service.list_all(skip, limit, organization_slug=organization_slug)


@router.patch(
    "/{ruleset_id}",
    response_model=SportRulesetResponse,
    summary="Atualizar Sport Ruleset"
)
async def update_sport_ruleset(
    ruleset_id: UUID,
    data: SportRulesetUpdate,
    session: AsyncSession = Depends(get_session)
):
    """
    Atualiza um sport ruleset existente.
    """
    service = SportRulesetService(session)
    return await service.update(ruleset_id, data)


@router.delete(
    "/{ruleset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar Sport Ruleset"
)
async def delete_sport_ruleset(
    ruleset_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """
    Deleta um sport ruleset.
    
    Só é possível deletar se não houver competições vinculadas.
    """
    service = SportRulesetService(session)
    await service.delete(ruleset_id)
