
from math import log2
from typing import List
import uuid
from src.models.sport_ruleset import SportRulesetModel
from src.models.matches import SegmentModel


class CompetitionGeneratorUtils:
    """Utilitários para geração de competições."""
    def get_elimination_round_names(self, num_feeders: int) -> list:
        """Retorna nomes das rodadas baseados no número de participantes da fase."""
        num_rounds = int(log2(num_feeders))
        names = []
        
        round_name_map = {
            2: "Final", 
            4: "Semifinais", 
            8: "Quartas de Final", 
            16: "Oitavas de Final"
        }

        for i in range(num_rounds):
            teams_in_round = 2**(num_rounds - i)
            name = round_name_map.get(teams_in_round, f'Fase de {teams_in_round}')
            names.append(name)
            
        return names

    def create_segments_for_match(self, match_id: uuid.UUID, ruleset: SportRulesetModel) -> List[SegmentModel]:
        """Cria segmentos (tempos/sets) para um jogo baseado no ruleset."""
        segments = []
        
        for seg_num in range(1, ruleset.segments_regular_number + 1):
            segments.append(SegmentModel(
                match_id=match_id,
                segment_number=seg_num,
                segment_type=ruleset.segment_type,
                home_score=0, away_score=0, finished=False
            ))
        
        if getattr(ruleset, 'overtime_segments', 0) > 0:
            for overtime_num in range(1, ruleset.overtime_segments + 1):
                segments.append(SegmentModel(
                    match_id=match_id,
                    segment_number=overtime_num,
                    segment_type='OVERTIME',
                    home_score=0, away_score=0, finished=False
                ))

        if getattr(ruleset, 'penalty_segments', 0) > 0:
            for penalty_num in range(1, ruleset.penalty_segments + 1):
                segments.append(SegmentModel(
                    match_id=match_id,
                    segment_number=penalty_num,
                    segment_type='PENALTY',
                    home_score=0, away_score=0, finished=False
                ))
        
        return segments