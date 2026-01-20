import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.competition import CompetitionModel
from src.models.teams import TeamModel
from src.models.matches import RoundModel, MatchModel, MatchStatus
import src.services.competition_generator.generate_competitions_utils as util

class GenerateLeagueCompetitionService:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def generate_league_system(self, competition: CompetitionModel, teams: List[TeamModel]):
        """
        Gera a tabela de jogos para sistema de pontos corridos (League).
        """
        if len(teams) % 2 != 0:
            teams.append(None) 

        num_teams = len(teams)
        num_rounds = num_teams - 1
        matches_per_round = num_teams // 2
        
        rounds_objects = []
        for i in range(num_rounds):
            rounds_objects.append(RoundModel(
                competition_id=competition.id,
                name=f"Rodada {i + 1}"
            ))
        
        self.session.add_all(rounds_objects)
        await self.session.flush()

        all_matches = []
        all_segments = []
        ruleset = competition.sport_ruleset

        for round_idx, round_obj in enumerate(rounds_objects):
            for i in range(matches_per_round):
                home = teams[i]
                away = teams[num_teams - 1 - i]

                if home is not None and away is not None:
                    match_uuid = uuid.uuid4()
                    match_number = i + 1

                    match = MatchModel(
                        id=match_uuid,
                        competition_id=competition.id,
                        round_id=round_obj.id,
                        home_team_id=home.id,
                        away_team_id=away.id,
                        status=MatchStatus.SCHEDULED,
                        local="A definir",
                        round_number_match=match_number
                    )
                    all_matches.append(match)

                    segments = util.create_segments_for_match(match_uuid, ruleset)
                    all_segments.extend(segments)
                    
            teams = [teams[0]] + [teams[-1]] + teams[1:-1]

        self.session.add_all(all_matches)
        self.session.add_all(all_segments)    