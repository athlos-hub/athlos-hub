from __future__ import annotations

import logging
import uuid
from typing import Any

import httpx

from src.config.settings import settings

logger = logging.getLogger(__name__)


class CompetitionsClientError(Exception):
    pass


async def get_team(team_id: uuid.UUID, authorization: str) -> dict[str, Any]:
    base = settings.COMPETITIONS_SERVICE_URL.rstrip("/")
    url = f"{base}/api/teams/{team_id}"
    async with httpx.AsyncClient(timeout=settings.COMPETITIONS_SERVICE_TIMEOUT) as client:
        r = await client.get(url, headers={"Authorization": authorization})
        if r.status_code == 404:
            raise CompetitionsClientError("not_found")
        r.raise_for_status()
        return r.json()


def competition_team_is_member(team: dict[str, Any], user_id: uuid.UUID) -> bool:
    players = team.get("players") or []
    for p in players:
        uid = p.get("user_id") or p.get("userId")
        try:
            if uid and uuid.UUID(str(uid)) == user_id:
                return True
        except ValueError:
            continue
    return False
