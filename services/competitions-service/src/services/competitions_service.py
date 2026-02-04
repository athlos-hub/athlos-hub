from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional, List

from src.models.competition import CompetitionModel, CompetitionStatus
from src.models.sport_ruleset import SportRulesetModel
from src.models.modality import ModalityModel
from src.models.stats import StatsRuleSetModel, StatsTypeModel
from src.models.teams import TeamModel, PlayerModel
from src.schemas.competition_schema import CompetitionCreate, CompetitionUpdate

class CompetitionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: CompetitionCreate) -> CompetitionModel:
        """
        Cria uma nova competição.
        Lida com a lógica de criar novos Rulesets (sport e stats) ou reutilizar existentes.
        """
        
        # 1. Validação da Modalidade
        query_modality = select(ModalityModel).where(ModalityModel.id == data.modality_id)
        result_modality = await self.session.execute(query_modality)
        if not result_modality.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Modalidade com ID {data.modality_id} não encontrada."
            )

        # 2. Resolução do Sport Ruleset (Regras do Jogo)
        final_sport_ruleset_id = None

        if data.sport_ruleset_id:
            query_ruleset = select(SportRulesetModel).where(SportRulesetModel.id == data.sport_ruleset_id)
            result_ruleset = await self.session.execute(query_ruleset)
            existing_ruleset = result_ruleset.scalar_one_or_none()
            
            if not existing_ruleset:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, 
                    detail=f"Sport Ruleset com ID {data.sport_ruleset_id} não encontrado."
                )
            final_sport_ruleset_id = existing_ruleset.id

        elif data.ruleset:
            new_ruleset = SportRulesetModel(**data.ruleset.model_dump())
            self.session.add(new_ruleset)
            await self.session.flush() 
            final_sport_ruleset_id = new_ruleset.id

        # 3. Criação da Competição
        comp_data = data.model_dump(exclude={
            "ruleset", 
            "sport_ruleset_id", 
            "stats_ruleset", 
            "stats_ruleset_id"
        })
        
        # Converter datetime com timezone para naive (sem timezone)
        # O banco usa TIMESTAMP WITHOUT TIME ZONE
        if comp_data.get("start_date") and comp_data["start_date"].tzinfo:
            comp_data["start_date"] = comp_data["start_date"].replace(tzinfo=None)
        if comp_data.get("end_date") and comp_data["end_date"].tzinfo:
            comp_data["end_date"] = comp_data["end_date"].replace(tzinfo=None)
        
        new_competition = CompetitionModel(
            **comp_data,
            sport_ruleset_id=final_sport_ruleset_id, 
            status=CompetitionStatus.PENDING    
        )
        self.session.add(new_competition)
        await self.session.flush()  # Precisamos do competition.id para stats_ruleset

        # 4. Resolução do Stats Ruleset (se fornecido)
        if data.stats_ruleset_id:
            # Verificar se o stats_ruleset existe
            query_stats = select(StatsRuleSetModel).where(StatsRuleSetModel.id == data.stats_ruleset_id)
            result_stats = await self.session.execute(query_stats)
            existing_stats = result_stats.scalar_one_or_none()
            
            if not existing_stats:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Stats Ruleset com ID {data.stats_ruleset_id} não encontrado."
                )
            
            # Atualizar o stats_ruleset para apontar para esta competição
            # Nota: Como competition_id é unique em stats_rulesets, isso pode falhar
            # se o stats_ruleset já estiver vinculado a outra competição
            if existing_stats.competition_id and existing_stats.competition_id != new_competition.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stats Ruleset {data.stats_ruleset_id} já está vinculado a outra competição."
                )
            
            existing_stats.competition_id = new_competition.id

        elif data.stats_ruleset:
            # Criar novo stats ruleset com seus tipos
            stats_data = data.stats_ruleset.model_dump(exclude={"stats_types"})
            new_stats_ruleset = StatsRuleSetModel(
                **stats_data,
                competition_id=new_competition.id
            )
            self.session.add(new_stats_ruleset)
            await self.session.flush()

            # Criar os tipos de estatísticas
            for stat_type_data in data.stats_ruleset.stats_types:
                stat_type = StatsTypeModel(
                    **stat_type_data.model_dump(),
                    stats_ruleset_id=new_stats_ruleset.id
                )
                self.session.add(stat_type)

        await self.session.commit()

        # 5. Recarregar com relacionamentos
        query_refresh = (
            select(CompetitionModel)
            .options(
                selectinload(CompetitionModel.sport_ruleset),
                selectinload(CompetitionModel.stats_ruleset).selectinload(StatsRuleSetModel.stats_types)
            )
            .where(CompetitionModel.id == new_competition.id)
        )
        result_refresh = await self.session.execute(query_refresh)
        
        return result_refresh.scalar_one()


    async def list_all(self, skip: int = 0, limit: int = 100, organization_slug: Optional[str] = None, status: Optional[str] = None):
        query = (
            select(CompetitionModel)
            .options(
                selectinload(CompetitionModel.sport_ruleset),
                selectinload(CompetitionModel.stats_ruleset).selectinload(StatsRuleSetModel.stats_types),
                selectinload(CompetitionModel.modality)
            )
        )
        
        if organization_slug:
            query = query.join(CompetitionModel.modality).where(
                ModalityModel.organization_slug == organization_slug
            )
        
        if status:
            try:
                status_enum = CompetitionStatus(status)
                query = query.where(CompetitionModel.status == status_enum)
            except ValueError:
                pass  # Ignorar status inválido
        
        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_by_id(self, competition_id: int) -> CompetitionModel:
        query = (
            select(CompetitionModel)
            .options(
                selectinload(CompetitionModel.sport_ruleset),
                selectinload(CompetitionModel.stats_ruleset).selectinload(StatsRuleSetModel.stats_types)
            )
            .where(CompetitionModel.id == competition_id)
        )
        result = await self.session.execute(query)
        competition = result.scalar_one_or_none()
        
        if not competition:
            raise HTTPException(status_code=404, detail="Competição não encontrada")
            
        return competition

    async def get_stats_ruleset(self, competition_id: int) -> Optional[StatsRuleSetModel]:
        """
        Retorna o StatsRuleSet da competição com seus tipos de métricas.
        Retorna None se a competição não tiver stats configurados.
        """
        query = (
            select(StatsRuleSetModel)
            .options(selectinload(StatsRuleSetModel.stats_types))
            .where(StatsRuleSetModel.competition_id == competition_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_teams_with_players(self, competition_id: int) -> List[TeamModel]:
        """
        Retorna todos os times da competição com seus jogadores.
        """
        # Verifica se a competição existe
        comp_query = select(CompetitionModel).where(CompetitionModel.id == competition_id)
        comp_result = await self.session.execute(comp_query)
        if not comp_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Competição não encontrada")

        query = (
            select(TeamModel)
            .options(selectinload(TeamModel.players))
            .where(TeamModel.competition_id == competition_id)
            .order_by(TeamModel.name)
        )
        result = await self.session.execute(query)
        return result.scalars().all()