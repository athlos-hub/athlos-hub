from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.models.stats import PlayerStatsModel, StatsTypeModel, StatsRuleSetModel
from src.models.teams import PlayerModel, TeamModel
from src.models.standings import ClassificationModel
from src.models.matches import GroupModel, RoundModel, MatchModel
from src.models.competition import CompetitionModel, CompetitionSystem, CompetitionPhase


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
    
    async def get_competition_standings(
        self,
        competition_id: int,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        comp_res = await self.session.execute(
            select(CompetitionModel).where(CompetitionModel.id == competition_id)
        )
        competition = comp_res.scalar_one_or_none()
        if not competition:
            return []

        if competition.system == CompetitionSystem.POINTS:
            q = (
                select(
                    ClassificationModel.team_id,
                    TeamModel.name,
                    ClassificationModel.points,
                    ClassificationModel.wins,
                    ClassificationModel.draws,
                    ClassificationModel.losses,
                    ClassificationModel.score_pro,
                    ClassificationModel.score_against,
                    ClassificationModel.score_balance,
                )
                .join(TeamModel, TeamModel.id == ClassificationModel.team_id)
                .where(
                    ClassificationModel.competition_id == competition_id,
                    ClassificationModel.group_id.is_(None),
                )
                .order_by(
                    ClassificationModel.points.desc(),
                    ClassificationModel.wins.desc(),
                    ClassificationModel.score_balance.desc(),
                    ClassificationModel.losses.asc(),
                    ClassificationModel.score_pro.desc(),
                )
            )
            if limit and limit > 0:
                q = q.limit(limit)
            res = await self.session.execute(q)
            rows = res.all()
            return [
                {
                    "team_id": r.team_id,
                    "team_name": r.name,
                    "points": r.points,
                    "wins": r.wins,
                    "draws": r.draws,
                    "losses": r.losses,
                    "score_pro": r.score_pro,
                    "score_against": r.score_against,
                    "score_balance": r.score_balance,
                }
                for r in rows
            ]

        if competition.system == CompetitionSystem.MIXED:
            if competition.current_phase == CompetitionPhase.ELIMINATION:
                return await self._get_bracket(competition_id)
            groups_res = await self.session.execute(
                select(GroupModel).where(GroupModel.competition_id == competition_id).order_by(GroupModel.name)
            )
            groups = groups_res.scalars().all()
            result: List[Dict[str, Any]] = []
            for g in groups:
                q = (
                    select(
                        ClassificationModel.team_id,
                        TeamModel.name,
                        ClassificationModel.points,
                        ClassificationModel.wins,
                        ClassificationModel.draws,
                        ClassificationModel.losses,
                        ClassificationModel.score_pro,
                        ClassificationModel.score_against,
                        ClassificationModel.score_balance,
                    )
                    .join(TeamModel, TeamModel.id == ClassificationModel.team_id)
                    .where(
                        ClassificationModel.competition_id == competition_id,
                        ClassificationModel.group_id == g.id,
                    )
                    .order_by(
                        ClassificationModel.points.desc(),
                        ClassificationModel.wins.desc(),
                        ClassificationModel.score_balance.desc(),
                        ClassificationModel.losses.asc(),
                        ClassificationModel.score_pro.desc(),
                    )
                )
                if limit and limit > 0:
                    q = q.limit(limit)
                res = await self.session.execute(q)
                rows = res.all()
                result.append(
                    {
                        "group_id": g.id,
                        "group_name": g.name,
                        "standings": [
                            {
                                "team_id": r.team_id,
                                "team_name": r.name,
                                "points": r.points,
                                "wins": r.wins,
                                "draws": r.draws,
                                "losses": r.losses,
                                "score_pro": r.score_pro,
                                "score_against": r.score_against,
                                "score_balance": r.score_balance,
                            }
                            for r in rows
                        ],
                    }
                )
            return result

        return await self._get_bracket(competition_id)

    async def _get_bracket(self, competition_id: int) -> List[Dict[str, Any]]:
        rounds_res = await self.session.execute(
            select(RoundModel).where(RoundModel.competition_id == competition_id).order_by(RoundModel.id)
        )
        rounds = rounds_res.scalars().all()
        data: List[Dict[str, Any]] = []
        for rnd in rounds:
            matches_res = await self.session.execute(
                select(MatchModel)
                .where(MatchModel.round_id == rnd.id)
                .order_by(MatchModel.round_number_match)
            )
            matches = matches_res.scalars().all()
            data.append(
                {
                    "round_id": rnd.id,
                    "round_name": rnd.name,
                    "matches": [
                        {
                            "match_id": m.id,
                            "home_team_id": m.home_team_id,
                            "away_team_id": m.away_team_id,
                            "home_score": m.home_score,
                            "away_score": m.away_score,
                            "status": m.status,
                        }
                        for m in matches
                    ],
                }
            )
        return data
        