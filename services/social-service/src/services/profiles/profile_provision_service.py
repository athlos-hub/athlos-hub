"""Provisionamento de perfis via mensageria (auth / competitions → social)."""

from __future__ import annotations

import logging
from typing import Any

from aio_pika import IncomingMessage
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.messaging.constants import (
    RK_PROFILE_ATHLETE_ENSURE,
    RK_PROFILE_ORGANIZATION_ENSURE,
    RK_PROFILE_TEAM_DELETE,
    RK_PROFILE_TEAM_ENSURE,
)
from src.services.profiles.profiles_service import (
    delete_team_social_data,
    get_or_create_athlete,
    get_or_create_org,
    get_or_create_team,
)

logger = logging.getLogger(__name__)


def _bool(payload: dict[str, Any], *keys: str, default: bool = False) -> bool:
    for k in keys:
        if k in payload and payload[k] is not None:
            return bool(payload[k])
    return default


async def process_profile_message(
    session: AsyncSession, message: IncomingMessage, payload: dict[str, Any]
) -> None:
    rk = message.routing_key or ""
    if rk == RK_PROFILE_ATHLETE_ENSURE:
        kid = str(payload.get("keycloak_id") or payload.get("keycloakId") or "").strip()
        if not kid:
            logger.warning("profile.athlete.ensure sem keycloak_id: %s", payload)
            return
        await get_or_create_athlete(session, kid)
        return

    if rk == RK_PROFILE_ORGANIZATION_ENSURE:
        slug = str(
            payload.get("organization_slug") or payload.get("organizationSlug") or ""
        ).strip()
        if not slug:
            logger.warning("profile.organization.ensure sem slug: %s", payload)
            return
        approved = _bool(payload, "approved_for_social", "approvedForSocial")
        org = await get_or_create_org(session, slug)
        org.approved_for_social = approved
        return

    if rk == RK_PROFILE_TEAM_ENSURE:
        team_id = str(payload.get("team_id") or payload.get("teamId") or "").strip()
        org_slug = str(
            payload.get("organization_slug") or payload.get("organizationSlug") or ""
        ).strip()
        if not team_id:
            logger.warning("profile.team.ensure sem team_id: %s", payload)
            return
        approved = _bool(payload, "approved_for_social", "approvedForSocial", default=True)
        team = await get_or_create_team(
            session, team_id, org_slug if org_slug else None
        )
        team.approved_for_social = approved
        return

    if rk == RK_PROFILE_TEAM_DELETE:
        team_id = str(payload.get("team_id") or payload.get("teamId") or "").strip()
        if not team_id:
            logger.warning("profile.team.delete sem team_id: %s", payload)
            return
        await delete_team_social_data(session, team_id)
        return

    logger.warning("Routing key de perfil desconhecida: %s", rk)
