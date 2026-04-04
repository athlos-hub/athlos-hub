from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.moderation.openai_client import assert_content_allowed
from src.models import AthleteProfile, Post, TeamProfile
from src.services.posts_service import (
    create_achievement_athlete_post,
    create_achievement_team_post,
)

logger = logging.getLogger(__name__)

ACHIEVEMENT_META: dict[str, tuple[str, str]] = {
    "TOP_SCORER": ("🎯 Artilheiro", "Maior pontuador da competição"),
    "CHAMPION": ("👑 Campeão", "Campeão da competição"),
    "RUNNER_UP": ("🥈 Vice-Campeão", "Vice-campeão da competição"),
    "UNDEFEATED": ("💪 Invencível", "Completou competição sem derrotas"),
    "HAT_TRICK_WINS": ("⚡ Hat-trick", "3 vitórias consecutivas"),
    "TEAM_CHAMPION": ("👑 Campeão", "Time campeão da competição"),
    "BEST_DEFENSE": ("🛡️ Muralha", "Melhor defesa da competição"),
    "POWERFUL_ATTACK": ("🎯 Ataque Implacável", "Ataque com 50+ pontos"),
    "TEAM_UNDEFEATED": ("💪 Invencível", "Time sem derrotas na competição"),
    "VETERAN": ("🎖️ Veterano", "Participou de 5+ competições"),
    "MULTI_CHAMPION": ("🌟 Multicampeão", "Venceu 3+ competições"),
}


def _achievement_content(
    achievement_type: str, competition_name: str | None, description: str
) -> str:
    cname = competition_name or "uma competição"
    display, _desc = ACHIEVEMENT_META.get(
        achievement_type, (achievement_type, description)
    )
    return f"🏆 Conquista desbloqueada: {display} em {cname}! {description}"


async def process_achievement_notification(
    session: AsyncSession, payload: dict[str, Any]
) -> Post:
    target_id = str(payload.get("targetId") or payload["target_id"])
    target_type = str(
        payload.get("targetType") or payload.get("target_type", "")
    ).upper()
    raw_type = payload.get("achievementType") or payload.get("achievement_type")
    if hasattr(raw_type, "value"):
        achievement_type = raw_type.value
    else:
        achievement_type = str(raw_type)

    meta = ACHIEVEMENT_META.get(achievement_type, (achievement_type, ""))
    description = meta[1]

    achievement_data: dict[str, Any] = {
        "achievementType": achievement_type,
        "displayName": meta[0],
        "description": description,
        "competitionId": payload.get("competitionId") or payload.get("competition_id"),
        "competitionName": payload.get("competitionName")
        or payload.get("competition_name"),
    }
    md = payload.get("metadata")
    if md:
        achievement_data.update(md)

    content = _achievement_content(
        achievement_type,
        payload.get("competitionName") or payload.get("competition_name"),
        description,
    )

    await assert_content_allowed(content)

    if target_type == "PLAYER":
        prof = await session.scalar(
            select(AthleteProfile).where(AthleteProfile.keycloak_id == target_id)
        )
        if not prof:
            prof = AthleteProfile(keycloak_id=target_id)
            session.add(prof)
            await session.flush()

        ach = dict(prof.achievements or {})
        if achievement_type not in ach:
            ach[achievement_type] = achievement_data
            prof.achievements = ach
            prof.achievements_count = len(ach)

        return await create_achievement_athlete_post(
            session, target_id, content, achievement_data
        )

    if target_type == "TEAM":
        tprof = await session.scalar(
            select(TeamProfile).where(TeamProfile.team_id == target_id)
        )
        if not tprof:
            tprof = TeamProfile(team_id=target_id, organization_slug="_unknown")
            session.add(tprof)
            await session.flush()

        ach = dict(tprof.achievements or {})
        if achievement_type not in ach:
            ach[achievement_type] = achievement_data
            tprof.achievements = ach
            tprof.achievements_count = len(ach)

        return await create_achievement_team_post(
            session, target_id, content, achievement_data
        )

    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        detail=f"Tipo de target inválido: {target_type}",
    )
