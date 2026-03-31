from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID

from src.models.stats import StatsRuleSetModel, StatsTypeModel
from src.models.competition import CompetitionModel
from src.schemas.stats_ruleset_schema import (
    StatsRuleSetCreate, 
    StatsRuleSetUpdate,
    StatsTypeCreate,
    StatsTypeUpdate
)


class StatsRuleSetService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, competition_id: UUID, data: StatsRuleSetCreate) -> StatsRuleSetModel:
        """
        Cria um novo StatsRuleSet para uma competição específica.
        Agora uma competição pode ter múltiplos stats rulesets.
        """
        # Verificar se a competição existe
        comp_query = select(CompetitionModel).where(CompetitionModel.id == competition_id)
        comp_result = await self.session.execute(comp_query)
        competition = comp_result.scalar_one_or_none()
        
        if not competition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Competição com ID {competition_id} não encontrada"
            )

        # Criar o ruleset
        ruleset_data = data.model_dump(exclude={"stats_types"})
        new_ruleset = StatsRuleSetModel(**ruleset_data, competition_id=competition_id)
        self.session.add(new_ruleset)
        await self.session.flush()

        # Criar os tipos de estatísticas
        for stat_type_data in data.stats_types:
            stat_type = StatsTypeModel(
                **stat_type_data.model_dump(),
                stats_ruleset_id=new_ruleset.id
            )
            self.session.add(stat_type)

        await self.session.commit()

        # Recarregar com relacionamentos
        query = (
            select(StatsRuleSetModel)
            .options(selectinload(StatsRuleSetModel.stats_types))
            .where(StatsRuleSetModel.id == new_ruleset.id)
        )
        result = await self.session.execute(query)
        return result.scalar_one()

    async def get_by_competition(self, competition_id: UUID) -> Optional[StatsRuleSetModel]:
        """
        Retorna o StatsRuleSet de uma competição com seus tipos.
        """
        query = (
            select(StatsRuleSetModel)
            .options(selectinload(StatsRuleSetModel.stats_types))
            .where(StatsRuleSetModel.competition_id == competition_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id(self, ruleset_id: UUID) -> StatsRuleSetModel:
        """
        Retorna um StatsRuleSet pelo ID.
        """
        query = (
            select(StatsRuleSetModel)
            .options(selectinload(StatsRuleSetModel.stats_types))
            .where(StatsRuleSetModel.id == ruleset_id)
        )
        result = await self.session.execute(query)
        ruleset = result.scalar_one_or_none()
        
        if not ruleset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stats Ruleset com ID {ruleset_id} não encontrado"
            )
        
        return ruleset

    async def update(self, ruleset_id: UUID, data: StatsRuleSetUpdate) -> StatsRuleSetModel:
        """
        Atualiza um StatsRuleSet existente.
        """
        ruleset = await self.get_by_id(ruleset_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(ruleset, key, value)
        
        await self.session.commit()
        await self.session.refresh(ruleset)
        
        return ruleset

    async def delete(self, ruleset_id: UUID) -> None:
        """
        Deleta um StatsRuleSet e seus tipos associados (cascade).
        """
        ruleset = await self.get_by_id(ruleset_id)
        await self.session.delete(ruleset)
        await self.session.commit()

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[StatsRuleSetModel]:
        """
        Lista todos os StatsRuleSets com seus tipos.
        """
        query = (
            select(StatsRuleSetModel)
            .options(selectinload(StatsRuleSetModel.stats_types))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    # Operações em StatsTypes individuais
    async def add_stat_type(self, ruleset_id: UUID, data: StatsTypeCreate) -> StatsTypeModel:
        """
        Adiciona um novo tipo de estatística a um ruleset existente.
        """
        # Verificar se o ruleset existe
        await self.get_by_id(ruleset_id)
        
        stat_type = StatsTypeModel(**data.model_dump(), stats_ruleset_id=ruleset_id)
        self.session.add(stat_type)
        await self.session.commit()
        await self.session.refresh(stat_type)
        
        return stat_type

    async def update_stat_type(
        self, 
        ruleset_id: UUID, 
        stat_type_id: UUID, 
        data: StatsTypeUpdate
    ) -> StatsTypeModel:
        """
        Atualiza um tipo de estatística específico.
        """
        query = select(StatsTypeModel).where(
            StatsTypeModel.id == stat_type_id,
            StatsTypeModel.stats_ruleset_id == ruleset_id
        )
        result = await self.session.execute(query)
        stat_type = result.scalar_one_or_none()
        
        if not stat_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stat Type {stat_type_id} não encontrado no ruleset {ruleset_id}"
            )
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(stat_type, key, value)
        
        await self.session.commit()
        await self.session.refresh(stat_type)
        
        return stat_type

    async def delete_stat_type(self, ruleset_id: UUID, stat_type_id: UUID) -> None:
        """
        Remove um tipo de estatística de um ruleset.
        """
        query = select(StatsTypeModel).where(
            StatsTypeModel.id == stat_type_id,
            StatsTypeModel.stats_ruleset_id == ruleset_id
        )
        result = await self.session.execute(query)
        stat_type = result.scalar_one_or_none()
        
        if not stat_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stat Type {stat_type_id} não encontrado no ruleset {ruleset_id}"
            )
        
        await self.session.delete(stat_type)
        await self.session.commit()
