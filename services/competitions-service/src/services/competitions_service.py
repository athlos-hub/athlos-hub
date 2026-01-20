from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.models.competition import CompetitionModel, CompetitionStatus
from src.models.sport_ruleset import SportRulesetModel
from src.models.modality import ModalityModel
from src.schemas.competition_schema import CompetitionCreate, CompetitionUpdate

class CompetitionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: CompetitionCreate) -> CompetitionModel:
        """
        Cria uma nova competição.
        Lida com a lógica de criar um novo Ruleset ou reutilizar um existente.
        """
        
        # 1. Validação da Modalidade
        query_modality = select(ModalityModel).where(ModalityModel.id == data.modality_id)
        result_modality = await self.session.execute(query_modality)
        if not result_modality.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Modalidade com ID {data.modality_id} não encontrada."
            )

        # 2. Resolução do Ruleset (Regras do Jogo)
        final_ruleset_id = None

        if data.sport_ruleset_id:
            query_ruleset = select(SportRulesetModel).where(SportRulesetModel.id == data.sport_ruleset_id)
            result_ruleset = await self.session.execute(query_ruleset)
            existing_ruleset = result_ruleset.scalar_one_or_none()
            
            if not existing_ruleset:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, 
                    detail=f"Ruleset com ID {data.sport_ruleset_id} para reutilização não encontrado."
                )
            final_ruleset_id = existing_ruleset.id

        elif data.ruleset:
            new_ruleset = SportRulesetModel(**data.ruleset.model_dump())
            self.session.add(new_ruleset)
            await self.session.flush() 
            final_ruleset_id = new_ruleset.id
            

        # 3. Criação da Competição
        comp_data = data.model_dump(exclude={"ruleset", "sport_ruleset_id"})
        
        new_competition = CompetitionModel(
            **comp_data,
            sport_ruleset_id=final_ruleset_id, 
            status=CompetitionStatus.PENDING    
        )
        self.session.add(new_competition)
        await self.session.commit()

        query_refresh = (
            select(CompetitionModel)
            .options(selectinload(CompetitionModel.sport_ruleset))
            .where(CompetitionModel.id == new_competition.id)
        )
        result_refresh = await self.session.execute(query_refresh)
        
        return result_refresh.scalar_one()


    async def list_all(self, skip: int = 0, limit: int = 100):
        query = (
            select(CompetitionModel)
            .options(selectinload(CompetitionModel.sport_ruleset))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_by_id(self, competition_id: int) -> CompetitionModel:
        query = (
            select(CompetitionModel)
            .options(selectinload(CompetitionModel.sport_ruleset))
            .where(CompetitionModel.id == competition_id)
        )
        result = await self.session.execute(query)
        competition = result.scalar_one_or_none()
        
        if not competition:
            raise HTTPException(status_code=404, detail="Competição não encontrada")
            
        return competition