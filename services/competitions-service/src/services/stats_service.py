from typing import List, Optional, Dict, Any
import uuid
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
        competition_id: uuid.UUID,
        stats_metric_abbreviation: str,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retorna ranking de jogadores para uma métrica (abbreviation) específica
        dentro da competição, somando valores de todos os jogos e ordenando desc.

        Saída: dicts com player_id, player_keycloak_id, team_id, team_name,
        team_abbreviation, stat_value (e total_value espelhado para compatibilidade).
        """

        query = (
            select(
                PlayerModel.id.label("player_id"),
                PlayerModel.keycloak_id.label("player_keycloak_id"),
                PlayerModel.team_id.label("team_id"),
                TeamModel.name.label("team_name"),
                TeamModel.abbreviation.label("team_abbreviation"),
                func.sum(PlayerStatsModel.value).label("total_value"),
            )
            .join(PlayerStatsModel, PlayerStatsModel.player_id == PlayerModel.id)
            .join(StatsTypeModel, PlayerStatsModel.stats_type_id == StatsTypeModel.id)
            .join(StatsRuleSetModel, StatsTypeModel.stats_ruleset_id == StatsRuleSetModel.id)
            .join(TeamModel, TeamModel.id == PlayerModel.team_id)
            .where(
                StatsRuleSetModel.competition_id == competition_id,
                StatsTypeModel.abbreviation == stats_metric_abbreviation,
            )
            .group_by(
                PlayerModel.id,
                PlayerModel.keycloak_id,
                PlayerModel.team_id,
                TeamModel.name,
                TeamModel.abbreviation,
            )
            .order_by(func.sum(PlayerStatsModel.value).desc())
        )

        if limit and limit > 0:
            query = query.limit(limit)

        result = await self.session.execute(query)
        rows = result.all()

        rankings: List[Dict[str, Any]] = []
        for (
            player_id,
            player_keycloak_id,
            team_id,
            team_name,
            team_abbreviation,
            total_value,
        ) in rows:
            val = int(total_value or 0)
            rankings.append(
                {
                    "player_id": str(player_id),
                    "player_keycloak_id": str(player_keycloak_id),
                    "team_id": str(team_id),
                    "team_name": team_name or "",
                    "team_abbreviation": team_abbreviation or "",
                    "stat_value": val,
                    "total_value": val,
                }
            )

        return rankings
    
    async def get_competition_standings(
        self,
        competition_id: uuid.UUID,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        print(f"[StatsService] Buscando standings para competição {competition_id}")
        
        comp_res = await self.session.execute(
            select(CompetitionModel).where(CompetitionModel.id == competition_id)
        )
        competition = comp_res.scalar_one_or_none()
        if not competition:
            print(f"[StatsService] Competição {competition_id} não encontrada")
            return []
        
        print(f"[StatsService] Competição encontrada: {competition.name}, sistema: {competition.system}")

        if competition.system == CompetitionSystem.POINTS:
            print(f"[StatsService] Sistema de pontos corridos, buscando classificação única")
            q = (
                select(
                    ClassificationModel.team_id,
                    TeamModel.name,
                    TeamModel.abbreviation,
                    TeamModel.logo_url,
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
            print(f"[StatsService] Encontrados {len(rows)} times na classificação")
            return [
                {
                    "team_id": str(r.team_id),
                    "team_name": r.name,
                    "team_abbreviation": (r.abbreviation or "") if r.abbreviation is not None else "",
                    "team_logo_url": r.logo_url,
                    "points": r.points,
                    "matches_played": r.wins + r.draws + r.losses,
                    "wins": r.wins,
                    "draws": r.draws,
                    "losses": r.losses,
                    "goals_for": r.score_pro,
                    "goals_against": r.score_against,
                    "goal_difference": r.score_balance,
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
                        TeamModel.abbreviation,
                        TeamModel.logo_url,
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
                                "team_abbreviation": (r.abbreviation or "") if r.abbreviation is not None else "",
                                "team_logo_url": r.logo_url,
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

    async def _get_bracket(self, competition_id: uuid.UUID) -> List[Dict[str, Any]]:
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
