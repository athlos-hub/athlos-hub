from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from src.models.competition import CompetitionModel, CompetitionSystem, CompetitionStatus
from src.models.teams import TeamModel
from src.models.matches import MatchModel, RoundModel, MatchStatus, SegmentModel
from src.models.sport_ruleset import SportRulesetModel

# Certifique-se de que a função initialize_standings existe ou comente se não tiver
from .standings_manager import initialize_standings

class StructureGeneratorService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def generate_structure(self, competition_id: int):
        # 1. Busca Competição com Regras
        query = (
            select(CompetitionModel)
            .options(selectinload(CompetitionModel.sport_ruleset))
            .where(CompetitionModel.id == competition_id)
        )
        result = await self.session.execute(query)
        competition = result.scalar_one_or_none()

        if not competition:
            raise HTTPException(status_code=404, detail="Competição não encontrada")

        # 2. Validações de Status
        # Verifica se o status é PENDING (tratando maiúsculas/minúsculas)
        current_status = str(competition.status).upper() if competition.status else ""
        if current_status != "PENDING":
             raise HTTPException(status_code=400, detail="A competição já foi iniciada ou finalizada.")

        if not competition.sport_ruleset:
            raise HTTPException(status_code=400, detail="A competição precisa de um Ruleset configurado.")

        # 3. Busca Times
        teams_query = select(TeamModel).where(TeamModel.competition_id == competition_id)
        teams_result = await self.session.execute(teams_query)
        teams = list(teams_result.scalars().all())

        if len(teams) < 2:
            raise HTTPException(status_code=400, detail="Mínimo de 2 times necessários.")

        # 4. Inicializa Classificação (Tabela de Pontos)
        # Se você ainda não tem esse módulo, pode comentar a linha abaixo
        await initialize_standings(self.session, competition, teams)

        # 5. Roteamento de Sistemas
        if competition.system == CompetitionSystem.POINTS:
            await self._generate_league_system(competition, teams)
        elif competition.system == CompetitionSystem.ELIMINATION:
            # await self._generate_elimination_system(competition, teams)
            pass 
        else:
            raise HTTPException(status_code=501, detail="Sistema de disputa ainda não implementado.")

        # 6. Atualiza Status para STARTED (ou equivalente)
        competition.status = CompetitionStatus.STARTED if hasattr(CompetitionStatus, 'STARTED') else "STARTED"
        self.session.add(competition)
        
        await self.session.commit()
        return {"message": "Estrutura gerada com sucesso", "system": competition.system}

    async def _generate_league_system(self, competition: CompetitionModel, teams: List[TeamModel]):
        """
        Gera a tabela de jogos para sistema de pontos corridos (League).
        """
        # Algoritmo Round Robin (Todos contra todos)
        # Se número ímpar de times, adiciona um 'dummy' para folga
        if len(teams) % 2 != 0:
            teams.append(None) 

        num_teams = len(teams)
        num_rounds = num_teams - 1
        matches_per_round = num_teams // 2
        
        # --- PASSO 1: Criar TODAS as Rodadas (Rounds) ---
        rounds_objects = []
        for i in range(num_rounds):
            # CORREÇÃO: RoundModel usa apenas 'name', sem 'round_number'
            rounds_objects.append(RoundModel(
                competition_id=competition.id,
                name=f"Rodada {i + 1}"
            ))
        
        self.session.add_all(rounds_objects)
        await self.session.flush() # Importante: Gera os IDs das rodadas para usar nos jogos

        # --- PASSO 2: Preparar Jogos e Segmentos ---
        all_matches = []
        all_segments = []
        ruleset = competition.sport_ruleset

        for round_idx, round_obj in enumerate(rounds_objects):
            for i in range(matches_per_round):
                home = teams[i]
                away = teams[num_teams - 1 - i]

                # Se ambos forem times reais (não é folga), cria o jogo
                if home is not None and away is not None:
                    match_uuid = uuid.uuid4()
                    match_number = i + 1 # Sequencial do jogo na rodada

                    match = MatchModel(
                        id=match_uuid,
                        competition_id=competition.id,
                        round_id=round_obj.id,
                        home_team_id=home.id,
                        away_team_id=away.id,
                        status=MatchStatus.SCHEDULED,
                        local="A definir",
                        round_number_match=match_number # Campo obrigatório do seu Model
                    )
                    all_matches.append(match)

                    # --- Criação dos Segmentos (Tempos/Sets) ---
                    
                    # 1. Tempos Regulares
                    for seg_num in range(1, ruleset.segments_regular_number + 1):
                        segment = SegmentModel(
                            match_id=match_uuid,
                            segment_number=seg_num,
                            segment_type=ruleset.segment_type, # CORREÇÃO: segment_type
                            home_score=0,
                            away_score=0,
                            finished=False
                        )
                        all_segments.append(segment)
                    
                    # 2. Prorrogação (Opcional)
                    if getattr(ruleset, 'overtime_segments', 0) > 0:
                        for overtime_num in range(1, ruleset.overtime_segments + 1):
                            segment = SegmentModel(
                                match_id=match_uuid,
                                segment_number=overtime_num,
                                segment_type='OVERTIME',
                                home_score=0,
                                away_score=0,
                                finished=False
                            )
                            all_segments.append(segment)

                    # 3. Pênaltis (Opcional)
                    if getattr(ruleset, 'penalty_segments', 0) > 0:
                        for penalty_num in range(1, ruleset.penalty_segments + 1):
                            segment = SegmentModel(
                                match_id=match_uuid,
                                segment_number=penalty_num,
                                segment_type='PENALTY',
                                home_score=0,
                                away_score=0,
                                finished=False
                            )
                            all_segments.append(segment)
                    
            # Rotação dos times (Mantém o primeiro fixo e gira o resto)
            teams = [teams[0]] + [teams[-1]] + teams[1:-1]

        self.session.add_all(all_matches)
        self.session.add_all(all_segments)