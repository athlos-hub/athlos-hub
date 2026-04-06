from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, distinct
from src.models.standings import ClassificationModel
from src.models.teams import TeamModel
from src.models.competition import CompetitionModel, CompetitionSystem
from src.models.matches import GroupModel, MatchModel

async def initialize_standings(
    session: AsyncSession, 
    competition: CompetitionModel, 
    teams: list[TeamModel]
):
    """
    Cria a entrada na tabela de classificação para todos os times da competição.
    
    Para competições MIXED:
    - Cria classifications COM group_id para cada grupo (fase de grupos)
    - Cria classifications SEM group_id para todos (tabela geral)
    
    Para outras competições:
    - Cria apenas classifications SEM group_id (tabela geral)
    """
    standings_list = []
    
    # Se é MIXED, buscar grupos e criar classifications por grupo
    if competition.system == CompetitionSystem.MIXED:
        groups_query = select(GroupModel).where(GroupModel.competition_id == competition.id)
        groups_result = await session.execute(groups_query)
        groups = groups_result.scalars().all()
        
        # Para cada grupo, criar classifications COM group_id
        for group in groups:
            # Buscar times que estão neste grupo (via matches do grupo)
            group_teams_query = select(distinct(TeamModel.id)).select_from(TeamModel).join(
                MatchModel, (MatchModel.home_team_id == TeamModel.id) | (MatchModel.away_team_id == TeamModel.id)
            ).where(MatchModel.group_id == group.id)
            
            group_teams_result = await session.execute(group_teams_query)
            group_team_ids = {team_id for (team_id,) in group_teams_result.all()}
            
            # Criar classification para cada time do grupo
            for team_id in group_team_ids:
                team = next((t for t in teams if t.id == team_id), None)
                if team:
                    standing = ClassificationModel(
                        competition_id=competition.id,
                        team_id=team.id,
                        group_id=group.id,  # ← COM group_id!
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
    
    # SEMPRE criar classifications GERAL (group_id=NULL) para todos os times
    for team in teams:
        standing = ClassificationModel(
            competition_id=competition.id,
            team_id=team.id,
            group_id=None,  # ← Tabela geral
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