import random
import uuid
from math import ceil
from typing import List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.competition import CompetitionModel
from src.models.teams import TeamModel
from src.models.matches import GroupModel, RoundModel, MatchModel, MatchStatus
import src.services.competition_generator.generate_competitions_utils as util

class GenerateGroupCompetitionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _generate_groups_elimination_system(self, competition: CompetitionModel, teams: List[TeamModel]):
        """
        Gera a estrutura híbrida: Fase de Grupos seguida de Eliminatórias (Mata-mata).
        """
        TEAMS_PER_GROUP = getattr(competition, "teams_per_group", 4)
        QUALIFIED_PER_GROUP = getattr(competition, "teams_qualified_per_group", 2)
        
        num_teams = len(teams)
        if num_teams < TEAMS_PER_GROUP:
             raise HTTPException(status_code=400, detail=f"Número de times ({num_teams}) insuficiente para o tamanho do grupo ({TEAMS_PER_GROUP}).")

        random.shuffle(teams)

        num_groups = ceil(num_teams / TEAMS_PER_GROUP)
        groups_objects = []
        
        for i in range(num_groups):
            group_name = f"Grupo {chr(65 + i)}"
            group = GroupModel(
                competition_id=competition.id,
                name=group_name
            )
            self.session.add(group)
            groups_objects.append(group)
        
        await self.session.flush()

        group_teams_map = {}
        for i, group in enumerate(groups_objects):
            start = i * TEAMS_PER_GROUP
            end = start + TEAMS_PER_GROUP
            group_teams = teams[start:end]
            group_teams_map[group.id] = group_teams
            
            await self._generate_group_internal_matches(competition, group, group_teams)

        total_qualified = num_groups * QUALIFIED_PER_GROUP
        
        if not self._is_power_of_two(total_qualified):
             raise HTTPException(status_code=400, detail=f"Número de classificados ({total_qualified}) deve ser potência de 2 (2, 4, 8, 16...). Ajuste times/grupos.")

        await self._generate_empty_knockout_bracket(competition, total_qualified)

    async def _generate_group_internal_matches(self, competition: CompetitionModel, group: GroupModel, teams: List[TeamModel]):
        """Gera jogos Round-Robin apenas para os times dentro de um grupo específico."""
        if len(teams) < 2:
            return

        if len(teams) % 2 != 0:
            teams.append(None)

        num_teams = len(teams)
        num_rounds = num_teams - 1
        matches_per_round = num_teams // 2
        ruleset = competition.sport_ruleset

        for round_idx in range(num_rounds):
            round_obj = RoundModel(
                competition_id=competition.id,
                name=f"{group.name} - Rodada {round_idx + 1}"
            )
            self.session.add(round_obj)
            await self.session.flush()

            for i in range(matches_per_round):
                home = teams[i]
                away = teams[num_teams - 1 - i]

                if home and away:
                    match_uuid = uuid.uuid4()
                    match = MatchModel(
                        id=match_uuid,
                        competition_id=competition.id,
                        group_id=group.id,
                        round_id=round_obj.id,
                        home_team_id=home.id,
                        away_team_id=away.id,
                        status=MatchStatus.SCHEDULED,
                        local="A definir",
                        round_number_match=i + 1
                    )
                    self.session.add(match)
                    
                    segments = util.create_segments_for_match(match_uuid, ruleset)
                    self.session.add_all(segments)

            teams = [teams[0]] + [teams[-1]] + teams[1:-1]

    async def _generate_empty_knockout_bracket(self, competition: CompetitionModel, num_teams: int):
        """
        Gera a árvore vazia (Placeholders) esperando a fase de grupos acabar.
        Ex: Se 16 times classificam -> Cria Oitavas, Quartas, Semi, Final.
        """
        round_names = util.get_elimination_round_names(num_teams)
        ruleset = competition.sport_ruleset
        
        previous_round_matches = []

        for r_idx, round_name in enumerate(round_names):
            round_obj = RoundModel(
                competition_id=competition.id,
                name=f"Fase Final - {round_name}"
            )
            self.session.add(round_obj)
            await self.session.flush()

            current_round_matches = []
            
            num_matches_in_round = num_teams // (2 ** (r_idx + 1))
            
            for i in range(num_matches_in_round):
                match_uuid = uuid.uuid4()
                
                home_feeder_id = None
                away_feeder_id = None
                
                if r_idx > 0:
                    feeder_1 = previous_round_matches[i * 2]
                    feeder_2 = previous_round_matches[(i * 2) + 1]
                    home_feeder_id = feeder_1.id
                    away_feeder_id = feeder_2.id

                match = MatchModel(
                    id=match_uuid,
                    competition_id=competition.id,
                    round_id=round_obj.id,
                    home_team_id=None,
                    away_team_id=None,
                    home_feeder_match_id=home_feeder_id,
                    away_feeder_match_id=away_feeder_id,
                    status=MatchStatus.PENDING,
                    local="A definir",
                    round_number_match=i + 1,
                    has_overtime=True,
                    has_penalties=True
                )
                self.session.add(match)
                current_round_matches.append(match)

                segments = self._create_segments_for_match(match_uuid, ruleset)
                self.session.add_all(segments)

            await self.session.flush()
            previous_round_matches = current_round_matches

    def _is_power_of_two(self, n: int) -> bool:
        """Verifica se n é potência de 2."""
        return (n & (n - 1)) == 0 and n > 0