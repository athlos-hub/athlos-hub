from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.competition import CompetitionModel, CompetitionPhase
from src.models.matches import GroupModel, RoundModel, MatchModel, MatchStatus
from src.models.standings import ClassificationModel
from .generate_competitions_utils import CompetitionGeneratorUtils as util


class EndGroupPhaseService:
    def __init__ (self, session: AsyncSession):
        self.session = session

    async def advance_group_phase(self, competition_id: int):
        """
        Finaliza a fase de grupos:
        1. Lê a classificação final de cada grupo.
        2. Determina os cruzamentos (Ex: 1º do A vs 2º do B).
        3. Atualiza os jogos da primeira rodada do mata-mata com os times reais.
        """
        query = select(CompetitionModel).where(CompetitionModel.id == competition_id)
        result = await self.session.execute(query)
        competition = result.scalar_one_or_none()
        
        if not competition:
            raise HTTPException(status_code=404, detail="Competição não encontrada.")

        QUALIFIED_PER_GROUP = getattr(competition, "teams_qualified_per_group", 2)

        groups_query = select(GroupModel).where(GroupModel.competition_id == competition.id).order_by(GroupModel.name)
        groups_result = await self.session.execute(groups_query)
        groups = groups_result.scalars().all()

        if not groups:
            raise HTTPException(status_code=400, detail="Esta competição não possui grupos para avançar.")

        placeholder_map = {}
        
        for group in groups:
            standings_query = (
                select(ClassificationModel)
                .where(ClassificationModel.group_id == group.id)
                .order_by(
                    desc(ClassificationModel.points),
                    desc(ClassificationModel.wins),
                    desc(ClassificationModel.score_balance),
                    desc(ClassificationModel.score_pro)
                )
                .options(selectinload(ClassificationModel.team))
                .limit(QUALIFIED_PER_GROUP)
            )
            
            standings_result = await self.session.execute(standings_query)
            top_teams_classification = standings_result.scalars().all()

            if len(top_teams_classification) < QUALIFIED_PER_GROUP:
                raise HTTPException(
                    status_code=400, 
                    detail=f"O grupo {group.name} não tem times suficientes classificados (esperado {QUALIFIED_PER_GROUP})."
                )

            for pos, classification in enumerate(top_teams_classification, start=1):
                key = f"{pos}º {group.name}"
                placeholder_map[key] = classification.team

        clashes = self._create_clashes(groups, QUALIFIED_PER_GROUP)

        total_qualified = len(groups) * QUALIFIED_PER_GROUP
        
        elimination_names = util.get_elimination_round_names(total_qualified)
        if not elimination_names:
             raise HTTPException(status_code=400, detail="Erro ao calcular fases eliminatórias.")
             
        first_round_name = elimination_names[0]

        round_query = select(RoundModel).where(
            RoundModel.competition_id == competition.id,
            RoundModel.name.contains(first_round_name) 
        )
        round_result = await self.session.execute(round_query)
        target_round = round_result.scalar_one_or_none()

        if not target_round:
             raise HTTPException(status_code=404, detail=f"Rodada '{first_round_name}' não encontrada no banco.")

        matches_query = (
            select(MatchModel)
            .where(MatchModel.round_id == target_round.id)
            .order_by(MatchModel.round_number_match)
        )
        matches_result = await self.session.execute(matches_query)
        matches = matches_result.scalars().all()

        if len(matches) != len(clashes):
            raise HTTPException(
                status_code=500, 
                detail=f"Inconsistência: Temos {len(clashes)} confrontos previstos mas {len(matches)} jogos na rodada."
            )

        matches_updated = 0
        for i, match in enumerate(matches):
            home_placeholder, away_placeholder = clashes[i]
            
            home_team = placeholder_map.get(home_placeholder)
            away_team = placeholder_map.get(away_placeholder)
            
            if home_team and away_team:
                match.home_team_id = home_team.id
                match.away_team_id = away_team.id
                match.status = MatchStatus.SCHEDULED
                self.session.add(match)
                matches_updated += 1
            else:
                print(f"ERRO: Não encontrei times para o confronto {home_placeholder} x {away_placeholder}")

        competition.current_phase = CompetitionPhase.ELIMINATION
        self.session.add(competition)
        await self.session.commit()
        return {
            "message": "Fase de grupos finalizada com sucesso.",
            "qualified_teams": total_qualified,
            "matches_updated": matches_updated,
            "round_name": first_round_name
        }
    
    def _create_clashes(self, groups: list, qualified_per_group: int) -> list:
        """
        Cria os confrontos teóricos baseados nos grupos.
        Lógica:
        - Lista todos os classificados: 1ºA, 2ºA, 1ºB, 2ºB...
        - Separa os 'Cabeças de Chave' (1ºs lugares) dos 'Potes Baixos' (2ºs lugares).
        - Inverte o pote baixo para cruzar extremos (A vs H, B vs G...).
        """
        all_placeholders = []
        
        first_places = []
        second_places = []
        
        for group in groups:
            first_places.append(f"1º {group.name}")
            if qualified_per_group >= 2:
                second_places.append(f"2º {group.name}")
        
        clashes = []
        if qualified_per_group == 2:
            rotated_seconds = second_places[1:] + second_places[:1]
            clashes = list(zip(first_places, rotated_seconds))
        else:
            all_seeds = first_places + second_places
            mid = len(all_seeds) // 2
            top = all_seeds[:mid]
            bottom = all_seeds[mid:]
            bottom.reverse()
            clashes = list(zip(top, bottom))
            
        return clashes