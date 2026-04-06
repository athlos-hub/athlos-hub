from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.competition import CompetitionModel, CompetitionStatus, CompetitionSystem
from src.models.matches import MatchModel, MatchStatus, RoundModel
from src.models.standings import ClassificationModel
from src.models.stats import StatsRuleSetModel, StatsTypeModel
from src.models.teams import TeamModel
from src.schemas.competition_schema import (
    CompetitionChampionTeamResponse,
    CompetitionHighlightsResponse,
    StatLeaderRowResponse,
    StatMetricLeadersResponse,
)
from src.services.stats_service import StatsService


class CompetitionOutcomeService:
    """Resolve campeão e destaques de estatísticas para competições finalizadas."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def build_highlights(self, competition_id: UUID) -> CompetitionHighlightsResponse:
        comp = await self.session.get(CompetitionModel, competition_id)
        if not comp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competição não encontrada")

        if comp.status != CompetitionStatus.FINISHED:
            return CompetitionHighlightsResponse()

        champion: Optional[CompetitionChampionTeamResponse] = None
        champ_id = await self._resolve_champion_team_id(comp)
        if champ_id:
            team = await self.session.get(TeamModel, champ_id)
            if team:
                champion = CompetitionChampionTeamResponse(
                    id=team.id,
                    name=team.name,
                    abbreviation=team.abbreviation or "",
                    logo_url=team.logo_url,
                )

        stat_leaders = await self._build_stat_leaders(competition_id)
        return CompetitionHighlightsResponse(champion_team=champion, stat_leaders=stat_leaders)

    async def _resolve_champion_team_id(self, competition: CompetitionModel) -> Optional[UUID]:
        cid = competition.id
        if competition.system == CompetitionSystem.POINTS:
            return await self._champion_from_standings(cid)

        if competition.system == CompetitionSystem.ELIMINATION:
            return await self._champion_from_elimination(cid)

        # MIXED: tenta vencedor do mata-mata; senão líder da tabela geral (pontos corridos / resíduo)
        w = await self._champion_from_elimination(cid)
        if w:
            return w
        return await self._champion_from_standings(cid)

    async def _champion_from_standings(self, competition_id: UUID) -> Optional[UUID]:
        q = (
            select(ClassificationModel.team_id)
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
            .limit(1)
        )
        res = await self.session.execute(q)
        return res.scalar_one_or_none()

    async def _champion_from_elimination(self, competition_id: UUID) -> Optional[UUID]:
        """
        Vencedor da última rodada (maior id) com partida finalizada e winner_team_id definido.
        """
        r_sub = (
            select(RoundModel.id)
            .where(RoundModel.competition_id == competition_id)
            .order_by(RoundModel.id.desc())
            .limit(1)
        )
        r_res = await self.session.execute(r_sub)
        last_round_id = r_res.scalar_one_or_none()
        if not last_round_id:
            return None

        m_q = (
            select(MatchModel.winner_team_id)
            .where(
                MatchModel.round_id == last_round_id,
                MatchModel.status == MatchStatus.FINISHED,
                MatchModel.winner_team_id.isnot(None),
            )
            .order_by(MatchModel.round_number_match)
            .limit(1)
        )
        m_res = await self.session.execute(m_q)
        return m_res.scalar_one_or_none()

    async def _build_stat_leaders(self, competition_id: UUID) -> List[StatMetricLeadersResponse]:
        rs_q = (
            select(StatsRuleSetModel)
            .options(selectinload(StatsRuleSetModel.stats_types))
            .where(StatsRuleSetModel.competition_id == competition_id)
        )
        rs_res = await self.session.execute(rs_q)
        ruleset = rs_res.scalar_one_or_none()
        if not ruleset or not ruleset.stats_types:
            return []

        stats_service = StatsService(self.session)
        types_sorted = sorted(ruleset.stats_types, key=lambda t: (t.name or "", t.abbreviation or ""))
        max_metrics = 8
        top_n = 3
        out: List[StatMetricLeadersResponse] = []

        for st in types_sorted[:max_metrics]:
            abbr = (st.abbreviation or "").strip()
            if not abbr:
                continue
            rows = await stats_service.get_player_rankings(
                competition_id, abbr, limit=top_n
            )
            if not rows:
                continue
            leaders = [
                StatLeaderRowResponse(
                    player_id=UUID(r["player_id"]),
                    player_keycloak_id=UUID(r["player_keycloak_id"]),
                    team_name=r.get("team_name") or "",
                    team_abbreviation=r.get("team_abbreviation") or "",
                    stat_value=int(r.get("stat_value") or 0),
                )
                for r in rows
            ]
            out.append(
                StatMetricLeadersResponse(
                    stat_type_id=st.id,
                    abbreviation=abbr,
                    name=st.name or abbr,
                    leaders=leaders,
                )
            )
        return out
