"""Publicação de eventos de jogo e leitura de histórico."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from live_service.common.enums import LiveStatus, MatchEventType
from live_service.infrastructure.http_clients import AuthServiceClient
from live_service.infrastructure import redis_client as rc
from live_service.repositories.event_repository import EventRepository
from live_service.repositories.live_repository import LiveRepository
from live_service.schemas.event import MatchEventResponse, PublishMatchEventBody
from live_service.infrastructure.messaging.stat_sync_publisher import (
    publish_match_stat_register,
)

logger = logging.getLogger(__name__)


class EventService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._lives = LiveRepository(session)
        self._events = EventRepository(session)
        self._auth = AuthServiceClient()

    async def _can_manage(self, keycloak_sub: str, organization_id: str) -> bool:
        details = await self._auth.get_organization_permission_details(
            keycloak_sub, organization_id
        )
        if not details.has_permission:
            return False
        role = (details.role or "").upper()
        return role in ("OWNER", "ORGANIZER")

    async def publish_event(
        self,
        live_id: str,
        keycloak_sub: str,
        body: PublishMatchEventBody,
    ) -> MatchEventResponse:
        live = await self._lives.find_by_id(live_id)
        if not live:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Live não encontrada",
            )

        if not await self._can_manage(keycloak_sub, live.organization_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Você não tem permissão para publicar eventos nesta live",
            )

        if live.status != LiveStatus.LIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível publicar eventos — status atual: {live.status}",
            )

        event_id = str(uuid.uuid4())
        ts = datetime.now(timezone.utc)

        raw_pl: dict = dict(body.payload) if body.payload else {}
        sync_blob = raw_pl.pop("_competitionsScoreSync", None)
        public_payload = {k: v for k, v in raw_pl.items() if not str(k).startswith("_")}

        await self._events.publish_event(
            event_id=event_id,
            live_id=live_id,
            event_type=body.type,
            payload=public_payload,
            created_at=ts,
        )

        if isinstance(sync_blob, dict) and sync_blob:
            try:
                await publish_match_stat_register(
                    event_id=event_id,
                    match_id=live.external_match_id,
                    sync=sync_blob,
                )
            except Exception as exc:
                logger.error("Falha ao publicar match.stat.register: %s", exc, exc_info=True)

        return MatchEventResponse(
            id=event_id,
            live_id=live_id,
            type=body.type,
            payload=public_payload,
            timestamp=ts.isoformat(),
        )

    async def get_events_history(
        self, live_id: str, limit: int | None
    ) -> list[MatchEventResponse]:
        lim = limit if limit is not None and limit > 0 else 50
        raw = await self._events.get_recent_events(live_id, limit=lim)
        out: list[MatchEventResponse] = []
        for item in raw:
            try:
                out.append(
                    MatchEventResponse(
                        id=item["id"],
                        live_id=item["liveId"],
                        type=MatchEventType(item["type"]),
                        payload=item.get("payload") or {},
                        timestamp=item.get("timestamp", ""),
                    )
                )
            except (KeyError, ValueError) as exc:
                logger.debug("Ignorando evento histórico inválido: %s", exc)
        return out

    async def get_chat_history(self, live_id: str, limit: int) -> dict:
        r = rc.redis_client.client()
        lim = limit if limit > 0 else 50
        messages = await rc.get_recent_chat_json(r, live_id, limit=lim)
        return {"messages": messages, "count": len(messages)}
