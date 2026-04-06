"""Webhooks MediaMTX: autenticação de publish e fim de publicação."""

import logging
import re
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from live_service.common.enums import LiveStatus
from live_service.infrastructure import redis_client as rc
from live_service.infrastructure.http_clients import CompetitionsClient
from live_service.repositories.live_repository import LiveRepository
from live_service.schemas.webhook import MediaMTXAuthBody, OnPublishDoneBody
from live_service.infrastructure.messaging.stat_sync_publisher import publish_match_live_finished

logger = logging.getLogger(__name__)


def extract_stream_key(path: str) -> str:
    clean = path.lstrip("/")
    if clean == "live":
        return ""
    m = re.match(r"live/([^?]+)", clean)
    if m:
        return m.group(1).split("?")[0]
    if "?" in clean:
        return clean.split("?")[0]
    return clean


class WebhookService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = LiveRepository(session)
        self._competitions = CompetitionsClient()

    async def mediamtx_auth(self, body: MediaMTXAuthBody) -> None:
        if body.action == "read":
            logger.info("Leitura permitida para path: %s", body.path)
            return
        if body.action != "publish":
            logger.warning("Ação desconhecida: %s", body.action)
            return

        stream_key = extract_stream_key(body.path)
        if not stream_key:
            logger.warning("Stream key vazia no path: %s", body.path)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid stream key",
            )

        r = rc.redis_client.client()
        meta = await rc.get_stream_metadata(r, stream_key)
        if not meta:
            logger.warning("Chave de transmissão inválida: %s", stream_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Chave de transmissão inválida",
            )

        live_id = meta.get("liveId") or ""
        live = await self._repo.find_by_id(live_id)
        if not live:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Live não encontrada",
            )

        if live.status not in (
            LiveStatus.SCHEDULED.value,
            LiveStatus.LIVE.value,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Live não está em um estado válido para aceitar transmissões",
            )

        await rc.mark_stream_active(r, stream_key)

        if live.status == LiveStatus.SCHEDULED.value:
            live.status = LiveStatus.LIVE.value
            live.started_at = datetime.now(timezone.utc)
            await self._repo.save_entity(live)
            logger.info("Live %s iniciada automaticamente", live.id)
            await self._competitions.start_match(live.external_match_id)

        logger.info(
            "Stream key %s válida; publicação aceita de IP %s",
            stream_key,
            body.ip,
        )

    async def on_publish_done(self, body: OnPublishDoneBody) -> None:
        stream_key = extract_stream_key(body.path)
        if not stream_key:
            logger.warning("Stream key vazia recebida no onPublishDone (path=%s)", body.path)
            return

        r = rc.redis_client.client()
        meta = await rc.get_stream_metadata(r, stream_key)
        if not meta or not meta.get("liveId"):
            logger.warning("Stream key %s não encontrada no Redis", stream_key)
            return

        live_id = meta["liveId"]
        await rc.mark_stream_inactive(r, stream_key)

        live = await self._repo.find_by_id(live_id)
        if not live:
            logger.warning("Live %s não encontrada no banco", live_id)
            return

        if not getattr(live, "transmit_video", True):
            logger.info(
                "Live %s: transmissão de vídeo desligada — fim do publish RTMP não encerra a partida",
                live_id,
            )
            return

        if live.status != LiveStatus.LIVE.value:
            logger.info("Live %s não está ativa, ignorando finalização automática", live_id)
            return

        live.status = LiveStatus.FINISHED.value
        live.ended_at = datetime.now(timezone.utc)
        await self._repo.save_entity(live)
        logger.info("Live %s finalizada após término da stream", live_id)
        try:
            await publish_match_live_finished(
                match_id=live.external_match_id,
                live_id=live.id,
                source="on_publish_done",
            )
        except Exception:
            logger.exception(
                "Falha ao publicar match.live.finished após on_publish_done (match=%s)",
                live.external_match_id,
            )
