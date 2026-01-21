from math import ceil, log2
import random
from typing import List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.competition import CompetitionModel
from src.models.teams import TeamModel
from src.models.matches import RoundModel, MatchModel, MatchStatus
import src.services.competition_generator.generate_competitions_utils as util

class GenerateEliminationCompetitionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _generate_elimination_system(self, competition: CompetitionModel, teams: List[TeamModel]):
        random.shuffle(teams)
        num_teams = len(teams)

        next_power_of_two = 2**ceil(log2(num_teams))
        num_of_byes = next_power_of_two - num_teams

        teams_with_byes = teams[:num_of_byes]
        teams_in_preliminary = teams[num_of_byes:]

        preliminary_matches = []
        all_matches_to_add = []
        all_segments_to_add = []
        
        ruleset = competition.sport_ruleset

        if teams_in_preliminary:
            preliminary_round = RoundModel(
                competition_id=competition.id,
                name="Rodada Preliminar"
            )
            self.session.add(preliminary_round)
            await self.session.flush()

            match_pairs = zip(teams_in_preliminary[::2], teams_in_preliminary[1::2])

            for i, (team1, team2) in enumerate(match_pairs, start=1):
                match_uuid = uuid.uuid4()
                match = MatchModel(
                    id=match_uuid,
                    competition_id=competition.id,
                    round_id=preliminary_round.id,
                    home_team_id=team1.id,
                    away_team_id=team2.id,
                    status=MatchStatus.SCHEDULED,
                    local="A definir",
                    round_number_match=i,
                    has_overtime=ruleset.overtime_segments > 0,
                    has_penalties=ruleset.penalty_segments > 0
                )
                all_matches_to_add.append(match)
                
                all_segments_to_add.extend(self._create_segments_for_match(match_uuid, ruleset))
                
                preliminary_matches.append(match)

            self.session.add_all(all_matches_to_add)
            await self.session.flush()
            all_matches_to_add.clear()

        next_round_feeders = [
            *teams_with_byes,
            *preliminary_matches
        ]

        previous_round_feeders = next_round_feeders
        
        round_names = self._get_elimination_round_names(len(previous_round_feeders))
       
        for round_index, round_name in enumerate(round_names):
            round_obj = RoundModel(
                competition_id=competition.id,
                name=round_name
            )
            self.session.add(round_obj)
            await self.session.flush()
            
            current_round_feeders = [] 
            
            feeder_pairs = zip(previous_round_feeders[::2], previous_round_feeders[1::2])

            for i, (home_feeder, away_feeder) in enumerate(feeder_pairs, start=1):
                match_uuid = uuid.uuid4()
                
                team_home_id = home_feeder.id if isinstance(home_feeder, TeamModel) else None
                feeder_home_id = home_feeder.id if isinstance(home_feeder, MatchModel) else None

                team_away_id = away_feeder.id if isinstance(away_feeder, TeamModel) else None
                feeder_away_id = away_feeder.id if isinstance(away_feeder, MatchModel) else None

                match = MatchModel(
                    id=match_uuid,
                    competition_id=competition.id,
                    round_id=round_obj.id,
                    home_team_id=team_home_id,
                    away_team_id=team_away_id,
                    home_feeder_match_id=feeder_home_id,
                    away_feeder_match_id=feeder_away_id,
                    status=MatchStatus.SCHEDULED,
                    local="A definir",
                    round_number_match=i,
                    has_overtime=ruleset.overtime_segments > 0,
                    has_penalties=ruleset.penalty_segments > 0
                )
                
                all_matches_to_add.append(match)
                
                all_segments_to_add.extend(util.create_segments_for_match(match_uuid, ruleset))
                
                current_round_feeders.append(match)

            self.session.add_all(all_matches_to_add)
            await self.session.flush()
            all_matches_to_add.clear()

            previous_round_feeders = current_round_feeders

        self.session.add_all(all_segments_to_add)