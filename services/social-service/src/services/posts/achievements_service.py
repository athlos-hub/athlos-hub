from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.infrastructure.http import auth_client
from src.infrastructure.moderation.openai_client import assert_content_allowed
from src.infrastructure.notifications import send_notification
from src.models import AthleteProfile, Post, TeamProfile
from src.services.posts.posts_service import (
    create_achievement_athlete_post,
    create_achievement_team_post,
)

logger = logging.getLogger(__name__)

# Conquistas vêm do competitions-service com title/description na metadata (definições por métrica).
# Não mantemos catálogo fixo de tipos antigos (campeão por classificação, invencível, etc.).
ACHIEVEMENT_META: dict[str, tuple[str, str]] = {}


def _achievement_content(
    achievement_type: str,
    competition_name: str | None,
    description: str,
    display_override: str | None = None,
) -> str:
    cname = competition_name or "uma competição"
    display, _desc = ACHIEVEMENT_META.get(
        achievement_type, (achievement_type, description)
    )
    if display_override:
        display = display_override
    return f"🏆 Conquista desbloqueada: {display} em {cname}! {description}"


def _achievement_storage_key(achievement_type: str, achievement_data: dict[str, Any]) -> str:
    achievement_id = str(achievement_data.get("achievementId") or "").strip()
    if achievement_id:
        return f"{achievement_type}:{achievement_id}"
    competition_id = str(achievement_data.get("competitionId") or "").strip()
    if competition_id:
        return f"{achievement_type}:{competition_id}"
    return achievement_type


async def process_achievement_notification(
    session: AsyncSession, payload: dict[str, Any]
) -> Optional[Post]:
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

    # Conquistas dinâmicas (ex.: por estatística da competição) enviam title/description na metadata
    display_name = achievement_data.get("displayName")
    if achievement_data.get("title"):
        display_name = str(achievement_data["title"])
        achievement_data["displayName"] = display_name
    description = str(achievement_data.get("description") or meta[1] or "")
    achievement_data["description"] = description

    content = _achievement_content(
        achievement_type,
        payload.get("competitionName") or payload.get("competition_name"),
        description,
        display_override=display_name if isinstance(display_name, str) else None,
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
        storage_key = _achievement_storage_key(achievement_type, achievement_data)
        if storage_key not in ach:
            ach[storage_key] = achievement_data
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

        if not tprof.approved_for_social:
            logger.info(
                "Conquista de time ignorada (perfil não aprovado no social): %s",
                target_id,
            )
            return None

        ach = dict(tprof.achievements or {})
        storage_key = _achievement_storage_key(achievement_type, achievement_data)
        if storage_key not in ach:
            ach[storage_key] = achievement_data
            tprof.achievements = ach
            tprof.achievements_count = len(ach)

        return await create_achievement_team_post(
            session, target_id, content, achievement_data
        )

    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        detail=f"Tipo de target inválido: {target_type}",
    )


async def emit_achievement_notifications(payload: dict[str, Any], post: Post | None) -> None:
    """Envia notificações in-app após persistir o post (fora da transação do post)."""
    if not post or not settings.NOTIFICATIONS_ENABLED:
        return

    md = payload.get("metadata") or {}
    target_type = str(payload.get("targetType") or "").upper()
    title_display = str(md.get("title") or md.get("displayName") or "Conquista")
    comp_name = str(payload.get("competitionName") or "").strip()
    summary = f"{comp_name}: {title_display}" if comp_name else title_display
    post_url = f"/social/post/{post.id}"

    if target_type == "PLAYER":
        kid = str(payload.get("targetId") or "").strip()
        if not kid:
            return
        uid = await auth_client.resolve_public_internal_user_id(kid)
        if not uid:
            return
        try:
            await send_notification(
                recipient_internal_user_id=str(uid),
                actor_keycloak_id=kid,
                notification_type="achievement_earned",
                title="Nova conquista",
                message=summary,
                extra_data={
                    "achievementTitle": title_display,
                    "competitionName": comp_name,
                },
                entity_id=uuid.UUID(str(post.id)) if post.id else None,
                action_url=post_url,
            )
        except Exception as e:
            logger.warning("Notificação de conquista individual falhou: %s", e)
        return

    if target_type == "TEAM":
        team_id = str(payload.get("targetId") or "").strip()
        kid = str(md.get("captainKeycloakId") or "").strip()
        if not kid:
            logger.info(
                "Conquista de equipe sem capitão no payload (captainKeycloakId); notificação omitida."
            )
            return
        uid = await auth_client.resolve_public_internal_user_id(kid)
        if not uid:
            return
        try:
            await send_notification(
                recipient_internal_user_id=str(uid),
                actor_keycloak_id=kid,
                notification_type="team_achievement_earned",
                title="Conquista da equipe",
                message=summary,
                extra_data={
                    "achievementTitle": title_display,
                    "competitionName": comp_name,
                    "teamId": team_id,
                },
                entity_id=uuid.UUID(str(post.id)) if post.id else None,
                action_url=f"/clubes/{team_id}" if team_id else post_url,
            )
        except Exception as e:
            logger.warning("Notificação de conquista de equipe (capitão) falhou: %s", e)
