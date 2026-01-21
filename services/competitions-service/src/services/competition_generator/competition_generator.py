from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.competition import CompetitionModel, CompetitionSystem, CompetitionStatus
from src.models.teams import TeamModel

from .standings_manager import initialize_standings
from .generate_league import GenerateLeagueCompetitionService as LeagueService
from .generate_elimination import GenerateEliminationCompetitionService as EliminationService
from .generate_group import GenerateGroupCompetitionService as GroupService

class StructureGeneratorService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def generate_structure(self, competition_id: int):
        query = (
            select(CompetitionModel)
            .options(selectinload(CompetitionModel.sport_ruleset))
            .where(CompetitionModel.id == competition_id)
        )
        result = await self.session.execute(query)
        competition = result.scalar_one_or_none()

        if not competition:
            raise HTTPException(status_code=404, detail="Competição não encontrada")

        current_status = str(competition.status).upper() if competition.status else ""
        if current_status != "PENDING":
             raise HTTPException(status_code=400, detail="A competição já foi iniciada ou finalizada.")

        if not competition.sport_ruleset:
            raise HTTPException(status_code=400, detail="A competição precisa de um Ruleset configurado.")

        teams_query = select(TeamModel).where(TeamModel.competition_id == competition_id)
        teams_result = await self.session.execute(teams_query)
        teams = list(teams_result.scalars().all())

        if len(teams) < 2:
            raise HTTPException(status_code=400, detail="Mínimo de 2 times necessários.")

        await initialize_standings(self.session, competition, teams)

        if competition.system == CompetitionSystem.POINTS:
            league_service = LeagueService(self.session)
            await league_service.generate_league_system(competition, teams)

        elif competition.system == CompetitionSystem.ELIMINATION:
            elimination_service = EliminationService(self.session)
            await elimination_service.generate_elimination_system(competition, teams)
        elif competition.system == CompetitionSystem.MIXED:
            group_service = GroupService(self.session)
            await group_service.generate_groups_elimination_system(competition, teams)
        else:
            raise HTTPException(status_code=501, detail="Sistema de disputa ainda não implementado.")

        competition.status = CompetitionStatus.STARTED if hasattr(CompetitionStatus, 'STARTED') else "STARTED"
        self.session.add(competition)
        
        await self.session.commit()
        return {"message": "Estrutura gerada com sucesso", "system": competition.system}