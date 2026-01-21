from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.models.stats import PlayerStatsModel, StatsTypeModel, StatsRuleSetModel
from src.models.teams import PlayerModel


class StatsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_player_rankings(
        self,
        competition_id: int,
        stats_metric_abbreviation: str,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retorna ranking de jogadores para uma métrica (abbreviation) específica
        dentro da competição, somando valores de todos os jogos e ordenando desc.

        Saída: lista de dicts com `player_id`, `team_id`, `total_value`.
        """

        query = (
            select(
                PlayerModel.id.label("player_id"),
                PlayerModel.team_id.label("team_id"),
                func.sum(PlayerStatsModel.value).label("total_value"),
            )
            .join(PlayerStatsModel, PlayerStatsModel.player_id == PlayerModel.id)
            .join(StatsTypeModel, PlayerStatsModel.stats_type_id == StatsTypeModel.id)
            .join(StatsRuleSetModel, StatsTypeModel.stats_ruleset_id == StatsRuleSetModel.id)
            .where(
                StatsRuleSetModel.competition_id == competition_id,
                StatsTypeModel.abbreviation == stats_metric_abbreviation,
            )
            .group_by(PlayerModel.id, PlayerModel.team_id)
            .order_by(func.sum(PlayerStatsModel.value).desc())
        )

        if limit and limit > 0:
            query = query.limit(limit)

        result = await self.session.execute(query)
        rows = result.all()

        # Normaliza saída em uma lista de dicts
        rankings: List[Dict[str, Any]] = []
        for player_id, team_id, total_value in rows:
            rankings.append({
                "player_id": player_id,
                "team_id": team_id,
                "total_value": int(total_value or 0),
            })

        return rankings
