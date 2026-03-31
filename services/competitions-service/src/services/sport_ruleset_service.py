from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID

from src.models.sport_ruleset import SportRulesetModel
from src.schemas.sport_ruleset_schema import SportRulesetCreate, SportRulesetUpdate


class SportRulesetService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: SportRulesetCreate) -> SportRulesetModel:
        """
        Cria um novo Sport Ruleset.
        """
        new_ruleset = SportRulesetModel(**data.model_dump())
        self.session.add(new_ruleset)
        await self.session.commit()
        await self.session.refresh(new_ruleset)
        
        return new_ruleset

    async def get_by_id(self, ruleset_id: UUID) -> SportRulesetModel:
        """
        Retorna um Sport Ruleset pelo ID.
        """
        query = select(SportRulesetModel).where(SportRulesetModel.id == ruleset_id)
        result = await self.session.execute(query)
        ruleset = result.scalar_one_or_none()
        
        if not ruleset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sport Ruleset com ID {ruleset_id} não encontrado"
            )
        
        return ruleset

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        organization_slug: Optional[str] = None,
    ) -> List[SportRulesetModel]:
        """
        Lista Sport Rulesets. Com organization_slug, apenas os daquela organização.
        """
        query = select(SportRulesetModel)
        if organization_slug is not None:
            query = query.where(SportRulesetModel.organization_slug == organization_slug)
        query = query.order_by(SportRulesetModel.name.asc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def update(self, ruleset_id: UUID, data: SportRulesetUpdate) -> SportRulesetModel:
        """
        Atualiza um Sport Ruleset existente.
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
        Deleta um Sport Ruleset.
        Nota: Só pode deletar se não houver competições vinculadas.
        """
        ruleset = await self.get_by_id(ruleset_id)
        
        # Verificar se há competições usando este ruleset
        from src.models.competition import CompetitionModel
        comp_query = select(CompetitionModel).where(
            CompetitionModel.sport_ruleset_id == ruleset_id
        ).limit(1)
        comp_result = await self.session.execute(comp_query)
        
        if comp_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível deletar este Sport Ruleset pois há competições vinculadas a ele"
            )
        
        await self.session.delete(ruleset)
        await self.session.commit()
