from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.achievements import (
    CompetitionAchievementDefinitionModel,
    CompetitionAchievementAwardModel,
)
from src.models.competition import CompetitionModel
from src.models.stats import StatsRuleSetModel, StatsTypeModel
from src.models.teams import PlayerModel, TeamModel
from src.services.social_client import SocialServiceClient, TargetType
from src.services.stats_service import StatsService
from src.schemas.competition_achievement_schema import (
    CompetitionAchievementAwardResponse,
    CompetitionAchievementDefinitionPatch,
    CompetitionAchievementDefinitionResponse,
)


class CompetitionAchievementsService:
    def __init__(self, session: AsyncSession, social_client: SocialServiceClient):
        self.session = session
        self.social_client = social_client

    @staticmethod
    def _definition_from_stat_name(name: str) -> tuple[str, str]:
        cleaned = (name or "").strip()
        code = f"TOP_{cleaned.upper().replace(' ', '_')}" if cleaned else "TOP_STAT"
        title = f"Top {cleaned}" if cleaned else "Top Estatística"
        return code[:120], title[:180]

    @staticmethod
    def _normalize_target_type(value: str | None) -> str:
        return "TEAM" if str(value or "").upper() == "TEAM" else "PLAYER"

    async def _captain_keycloak_id_for_team(self, team_id: UUID) -> str | None:
        team = await self.session.get(TeamModel, team_id)
        if not team or not team.team_captain:
            return None
        captain = await self.session.get(PlayerModel, team.team_captain)
        if not captain or not captain.keycloak_id:
            return None
        return str(captain.keycloak_id)

    async def sync_definitions_for_competition(self, competition_id: UUID) -> None:
        ruleset_q = select(StatsRuleSetModel.id).where(
            StatsRuleSetModel.competition_id == competition_id
        )
        ruleset_res = await self.session.execute(ruleset_q)
        ruleset_id = ruleset_res.scalar_one_or_none()

        if not ruleset_id:
            await self.session.execute(
                delete(CompetitionAchievementDefinitionModel).where(
                    CompetitionAchievementDefinitionModel.competition_id == competition_id
                )
            )
            await self.session.commit()
            return

        # Importante: buscar os stats_types diretamente do banco evita usar estado
        # stale do identity map da sessão (especialmente após delete de stat_type).
        stats_q = (
            select(StatsTypeModel.id, StatsTypeModel.name, StatsTypeModel.abbreviation)
            .where(StatsTypeModel.stats_ruleset_id == ruleset_id)
        )
        stats_res = await self.session.execute(stats_q)
        stats_rows = stats_res.all()

        defs_q = select(CompetitionAchievementDefinitionModel).where(
            CompetitionAchievementDefinitionModel.competition_id == competition_id
        )
        defs_res = await self.session.execute(defs_q)
        existing = defs_res.scalars().all()
        existing_by_stat = {d.stat_type_id: d for d in existing}
        stat_ids = {stat_id for stat_id, _, _ in stats_rows}

        for stat_id, stat_name, stat_abbreviation in stats_rows:
            label = (stat_name or stat_abbreviation or "").strip() or "Estatística"
            code, title = self._definition_from_stat_name(label)
            found = existing_by_stat.get(stat_id)
            if found:
                found.target_type = self._normalize_target_type(getattr(found, "target_type", "PLAYER"))
                if not getattr(found, "title_locked", False):
                    found.code = code
                    found.title = title
                    found.description = f"Maior valor em {label}"
                found.top_n = 1
                found.active = True
            else:
                self.session.add(
                    CompetitionAchievementDefinitionModel(
                        competition_id=competition_id,
                        stat_type_id=stat_id,
                        code=code,
                        title=title,
                        title_locked=False,
                        target_type="PLAYER",
                        description=f"Maior valor em {label}",
                        top_n=1,
                        active=True,
                    )
                )

        for stale in existing:
            if stale.stat_type_id not in stat_ids:
                await self.session.delete(stale)

        await self.session.commit()

    async def list_definitions(
        self, competition_id: UUID
    ) -> List[CompetitionAchievementDefinitionResponse]:
        q = (
            select(CompetitionAchievementDefinitionModel, StatsTypeModel.name)
            .join(StatsTypeModel, StatsTypeModel.id == CompetitionAchievementDefinitionModel.stat_type_id)
            .where(CompetitionAchievementDefinitionModel.competition_id == competition_id)
            .order_by(StatsTypeModel.display_order.asc().nullslast(), StatsTypeModel.name.asc())
        )
        res = await self.session.execute(q)
        rows: List[CompetitionAchievementDefinitionResponse] = []
        for definition, stat_name in res.all():
            rows.append(
                CompetitionAchievementDefinitionResponse(
                    id=definition.id,
                    competition_id=definition.competition_id,
                    stat_type_id=definition.stat_type_id,
                    stat_type_name=(stat_name or "").strip(),
                    code=definition.code,
                    title=definition.title,
                    title_locked=getattr(definition, "title_locked", False),
                    target_type=self._normalize_target_type(getattr(definition, "target_type", "PLAYER")),
                    description=definition.description,
                    top_n=definition.top_n,
                    active=definition.active,
                )
            )
        return rows

    async def patch_definition(
        self,
        competition_id: UUID,
        definition_id: UUID,
        data: CompetitionAchievementDefinitionPatch,
    ) -> CompetitionAchievementDefinitionResponse:
        q = select(CompetitionAchievementDefinitionModel).where(
            CompetitionAchievementDefinitionModel.id == definition_id,
            CompetitionAchievementDefinitionModel.competition_id == competition_id,
        )
        res = await self.session.execute(q)
        row = res.scalar_one_or_none()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conquista não encontrada nesta competição.",
            )

        if data.reset_auto_title:
            row.title_locked = False
            await self.session.commit()
            await self.sync_definitions_for_competition(competition_id)
            return await self._definition_response_by_id(competition_id, definition_id)

        if data.title is not None:
            t = data.title.strip()
            if not t:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Informe um nome para a conquista.",
                )
            row.title = t[:180]
            row.title_locked = True
        if data.target_type is not None:
            row.target_type = self._normalize_target_type(data.target_type)
        await self.session.commit()
        return await self._definition_response_by_id(competition_id, definition_id)

    async def _definition_response_by_id(
        self, competition_id: UUID, definition_id: UUID
    ) -> CompetitionAchievementDefinitionResponse:
        q = (
            select(CompetitionAchievementDefinitionModel, StatsTypeModel.name)
            .join(StatsTypeModel, StatsTypeModel.id == CompetitionAchievementDefinitionModel.stat_type_id)
            .where(
                CompetitionAchievementDefinitionModel.id == definition_id,
                CompetitionAchievementDefinitionModel.competition_id == competition_id,
            )
        )
        res = await self.session.execute(q)
        one = res.one_or_none()
        if not one:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conquista não encontrada.",
            )
        definition, stat_name = one
        return CompetitionAchievementDefinitionResponse(
            id=definition.id,
            competition_id=definition.competition_id,
            stat_type_id=definition.stat_type_id,
            stat_type_name=(stat_name or "").strip(),
            code=definition.code,
            title=definition.title,
            title_locked=getattr(definition, "title_locked", False),
            target_type=self._normalize_target_type(getattr(definition, "target_type", "PLAYER")),
            description=definition.description,
            top_n=definition.top_n,
            active=definition.active,
        )

    async def list_awards(self, competition_id: UUID) -> List[CompetitionAchievementAwardResponse]:
        q = (
            select(
                CompetitionAchievementAwardModel,
                CompetitionAchievementDefinitionModel.title,
                CompetitionAchievementDefinitionModel.code,
                StatsTypeModel.name,
            )
            .join(
                CompetitionAchievementDefinitionModel,
                CompetitionAchievementDefinitionModel.id == CompetitionAchievementAwardModel.definition_id,
            )
            .join(StatsTypeModel, StatsTypeModel.id == CompetitionAchievementDefinitionModel.stat_type_id)
            .where(CompetitionAchievementAwardModel.competition_id == competition_id)
            .order_by(CompetitionAchievementAwardModel.created_at.desc())
        )
        res = await self.session.execute(q)
        rows: List[CompetitionAchievementAwardResponse] = []
        for award, title, code, stat_name in res.all():
            rows.append(
                CompetitionAchievementAwardResponse(
                    id=award.id,
                    competition_id=award.competition_id,
                    definition_id=award.definition_id,
                    target_type=self._normalize_target_type(getattr(award, "target_type", "PLAYER")),
                    player_id=award.player_id,
                    player_keycloak_id=award.player_keycloak_id,
                    team_id=getattr(award, "team_id", None),
                    rank_position=award.rank_position,
                    stat_value=award.stat_value,
                    created_at=award.created_at,
                    achievement_title=title or "",
                    achievement_code=code or "",
                    stat_type_name=(stat_name or "").strip(),
                )
            )
        return rows

    async def award_competition_achievements(self, competition_id: UUID) -> int:
        competition = await self.session.get(CompetitionModel, competition_id)
        if not competition:
            return 0

        definitions = await self.list_definitions(competition_id)
        if not definitions:
            return 0

        # Reprocess awards idempotently every time competition is finalized again.
        await self.session.execute(
            delete(CompetitionAchievementAwardModel).where(
                CompetitionAchievementAwardModel.competition_id == competition_id
            )
        )
        await self.session.flush()

        stats_service = StatsService(self.session)
        sent = 0

        for definition in definitions:
            stat_abbreviation_q = select(StatsTypeModel.abbreviation).where(
                StatsTypeModel.id == definition.stat_type_id
            )
            stat_abbreviation_res = await self.session.execute(stat_abbreviation_q)
            abbr = stat_abbreviation_res.scalar_one_or_none()
            if not abbr:
                continue

            definition_target_type = self._normalize_target_type(
                getattr(definition, "target_type", "PLAYER")
            )
            ranking_limit = max(1, int(definition.top_n or 1))
            if definition_target_type == "TEAM":
                ranking = await stats_service.get_team_rankings(
                    competition_id, abbr, limit=ranking_limit
                )
            else:
                ranking = await stats_service.get_player_rankings(
                    competition_id, abbr, limit=ranking_limit
                )
            for index, row in enumerate(ranking, start=1):
                if definition_target_type == "TEAM":
                    team_id_raw = row.get("team_id")
                    if not team_id_raw:
                        continue
                    award = CompetitionAchievementAwardModel(
                        competition_id=competition_id,
                        definition_id=definition.id,
                        target_type="TEAM",
                        team_id=UUID(str(team_id_raw)),
                        rank_position=index,
                        stat_value=int(row.get("stat_value") or 0),
                    )
                else:
                    player_id_raw = row.get("player_id")
                    player_keycloak_raw = row.get("player_keycloak_id")
                    if not player_id_raw or not player_keycloak_raw:
                        continue
                    award = CompetitionAchievementAwardModel(
                        competition_id=competition_id,
                        definition_id=definition.id,
                        target_type="PLAYER",
                        player_id=UUID(str(player_id_raw)),
                        player_keycloak_id=UUID(str(player_keycloak_raw)),
                        rank_position=index,
                        stat_value=int(row.get("stat_value") or 0),
                    )
                self.session.add(award)
                await self.session.flush()

                target_id = (
                    str(award.team_id) if definition_target_type == "TEAM" else str(award.player_keycloak_id)
                )
                meta: dict = {
                    "achievementId": str(award.id),
                    "title": definition.title,
                    "description": definition.description or "",
                    "rankPosition": index,
                    "statValue": award.stat_value,
                    "statType": definition.stat_type_name,
                    "targetType": definition_target_type,
                }
                if definition_target_type == "TEAM" and award.team_id:
                    cap_kid = await self._captain_keycloak_id_for_team(award.team_id)
                    if cap_kid:
                        meta["captainKeycloakId"] = cap_kid
                await self.social_client.notify_achievement(
                    target_id=target_id,
                    target_type=TargetType.TEAM
                    if definition_target_type == "TEAM"
                    else TargetType.PLAYER,
                    achievement_type=definition.code,
                    competition_id=str(competition_id),
                    competition_name=competition.name,
                    metadata=meta,
                )
                sent += 1

        await self.session.commit()
        return sent
