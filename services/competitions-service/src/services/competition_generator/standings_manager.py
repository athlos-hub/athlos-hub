from sqlalchemy.ext.asyncio import AsyncSession
from src.models.standings import ClassificationModel
from src.models.teams import TeamModel
from src.models.competition import CompetitionModel

async def initialize_standings(
    session: AsyncSession, 
    competition: CompetitionModel, 
    teams: list[TeamModel]
):
    """
    Cria a entrada na tabela de classificação para todos os times da competição.
    """
    standings_list = []
    
    for team in teams:
        standing = ClassificationModel(
            competition_id=competition.id,
            team_id=team.id,
            group_id=None,
            points=0,
            games_played=0,
            wins=0,
            draws=0,
            losses=0,
            score_pro=0,
            score_against=0,
            score_balance=0
        )
        standings_list.append(standing)

    session.add_all(standings_list)