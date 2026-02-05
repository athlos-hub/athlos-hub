"""
Serviço para detectar e notificar conquistas
"""
import logging
from typing import List, Optional
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from src.models.standings import ClassificationModel
from src.models.matches import MatchModel, MatchStatus
from src.models.competition import CompetitionModel
from src.services.social_client import SocialServiceClient, AchievementType, TargetType

logger = logging.getLogger(__name__)


class AchievementsService:
    """Serviço para gerenciar conquistas"""
    
    def __init__(self, session: AsyncSession, social_client: SocialServiceClient):
        self.session = session
        self.social_client = social_client
    
    async def check_competition_end_achievements(
        self,
        competition_id: uuid.UUID
    ) -> None:
        """
        Verifica e notifica conquistas quando uma competição termina
        
        Args:
            competition_id: ID da competição finalizada
        """
        logger.info(f"Verificando conquistas para competição {competition_id}")
        
        # Buscar competição
        competition = await self.session.get(CompetitionModel, competition_id)
        if not competition:
            logger.warning(f"Competição {competition_id} não encontrada")
            return
        
        # Buscar classificações finais (ordenadas por pontos e saldo)
        stmt = (
            select(ClassificationModel)
            .where(ClassificationModel.competition_id == competition_id)
            .order_by(
                desc(ClassificationModel.points),
                desc(ClassificationModel.score_balance),
                desc(ClassificationModel.score_pro)
            )
        )
        result = await self.session.execute(stmt)
        classifications = result.scalars().all()
        
        if not classifications:
            logger.warning(f"Nenhuma classificação encontrada para competição {competition_id}")
            return
        
        # 1. 👑 Campeão (1º lugar)
        if len(classifications) > 0:
            champion = classifications[0]
            await self.social_client.notify_achievement(
                target_id=str(champion.team_id),
                target_type=TargetType.TEAM,
                achievement_type=AchievementType.TEAM_CHAMPION,
                competition_id=str(competition_id),
                competition_name=competition.name,
                metadata={
                    "points": champion.points,
                    "wins": champion.wins,
                    "position": 1,
                    "scorePro": champion.score_pro,
                    "scoreBalance": champion.score_balance
                }
            )
        
        # 2. 🥈 Vice-campeão (2º lugar)
        if len(classifications) > 1:
            runner_up = classifications[1]
            await self.social_client.notify_achievement(
                target_id=str(runner_up.team_id),
                target_type=TargetType.TEAM,
                achievement_type=AchievementType.RUNNER_UP,
                competition_id=str(competition_id),
                competition_name=competition.name,
                metadata={
                    "points": runner_up.points,
                    "position": 2
                }
            )
        
        # 3. 🎯 Artilheiro (maior score_pro)
        top_scorer = max(classifications, key=lambda c: c.score_pro)
        if top_scorer.score_pro > 0:
            await self.social_client.notify_achievement(
                target_id=str(top_scorer.team_id),
                target_type=TargetType.TEAM,
                achievement_type=AchievementType.TOP_SCORER,
                competition_id=str(competition_id),
                competition_name=competition.name,
                metadata={
                    "scorePro": top_scorer.score_pro
                }
            )
        
        # 4. 🛡️ Melhor Defesa (menor score_against)
        best_defense = min(classifications, key=lambda c: c.score_against)
        await self.social_client.notify_achievement(
            target_id=str(best_defense.team_id),
            target_type=TargetType.TEAM,
            achievement_type=AchievementType.BEST_DEFENSE,
            competition_id=str(competition_id),
            competition_name=competition.name,
            metadata={
                "scoreAgainst": best_defense.score_against
            }
        )
        
        # 5. 💪 Invencível (losses == 0)
        undefeated_teams = [c for c in classifications if c.losses == 0 and c.games_played > 0]
        for team in undefeated_teams:
            await self.social_client.notify_achievement(
                target_id=str(team.team_id),
                target_type=TargetType.TEAM,
                achievement_type=AchievementType.TEAM_UNDEFEATED,
                competition_id=str(competition_id),
                competition_name=competition.name,
                metadata={
                    "wins": team.wins,
                    "draws": team.draws,
                    "gamesPlayed": team.games_played
                }
            )
        
        # 6. 🎯 Ataque Implacável (score_pro >= 50)
        powerful_attacks = [c for c in classifications if c.score_pro >= 50]
        for team in powerful_attacks:
            await self.social_client.notify_achievement(
                target_id=str(team.team_id),
                target_type=TargetType.TEAM,
                achievement_type=AchievementType.POWERFUL_ATTACK,
                competition_id=str(competition_id),
                competition_name=competition.name,
                metadata={
                    "scorePro": team.score_pro
                }
            )
        
        logger.info(f"Conquistas verificadas para competição {competition_id}")
    
    async def check_hat_trick_wins(
        self,
        team_id: uuid.UUID,
        competition_id: uuid.UUID
    ) -> None:
        """
        Verifica se um time conquistou hat-trick de vitórias (3 vitórias consecutivas)
        
        Args:
            team_id: ID do time
            competition_id: ID da competição
        """
        # Buscar últimas 3 partidas concluídas do time na competição
        stmt = (
            select(MatchModel)
            .where(
                MatchModel.competition_id == competition_id,
                MatchModel.status == MatchStatus.COMPLETED,
                (MatchModel.home_team_id == team_id) | (MatchModel.away_team_id == team_id)
            )
            .order_by(desc(MatchModel.scheduled_datetime))
            .limit(3)
        )
        result = await self.session.execute(stmt)
        recent_matches = result.scalars().all()
        
        if len(recent_matches) < 3:
            return
        
        # Verificar se todas as 3 últimas são vitórias
        all_wins = all(match.winner_team_id == team_id for match in recent_matches)
        
        if all_wins:
            # Buscar nome da competição
            competition = await self.session.get(CompetitionModel, competition_id)
            if competition:
                await self.social_client.notify_achievement(
                    target_id=str(team_id),
                    target_type=TargetType.TEAM,
                    achievement_type=AchievementType.HAT_TRICK_WINS,
                    competition_id=str(competition_id),
                    competition_name=competition.name,
                    metadata={
                        "consecutiveWins": 3
                    }
                )
                logger.info(f"Time {team_id} conquistou hat-trick de vitórias!")
    
    async def check_match_end_achievements(
        self,
        match: MatchModel
    ) -> None:
        """
        Verifica conquistas após o término de uma partida
        
        Args:
            match: Partida finalizada
        """
        if match.status != MatchStatus.COMPLETED or not match.winner_team_id:
            return
        
        # Verificar hat-trick para o time vencedor
        await self.check_hat_trick_wins(match.winner_team_id, match.competition_id)
