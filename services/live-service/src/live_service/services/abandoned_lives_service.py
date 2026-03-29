"""Cron: finaliza lives em LIVE sem stream ativa há mais de 15 minutos."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from live_service.common.enums import LiveStatus
from live_service.infrastructure import redis_client as rc
from live_service.infrastructure.database.client import db
from live_service.infrastructure.database.models.live import Live

logger = logging.getLogger(__name__)

INACTIVE_THRESHOLD_MS = 15 * 60 * 1000


class AbandonedLivesService:
    async def check_abandoned_lives(self) -> None:
        logger.info("Verificando lives abandonadas...")
        async with db.session() as session:
            assert isinstance(session, AsyncSession)
            result = await session.execute(
                select(Live).where(Live.status == LiveStatus.LIVE.value)
            )
            lives = list(result.scalars().all())

            if not lives:
                logger.debug("Nenhuma live ativa no momento")
                return

            logger.info("%s live(s) ativa(s) encontrada(s)", len(lives))
            r = rc.redis_client.client()
            finished = 0

            for live in lives:
                if not live.started_at:
                    continue
                if await rc.is_stream_active(r, live.stream_key):
                    continue
                now = datetime.now(timezone.utc)
                delta_ms = (now - live.started_at).total_seconds() * 1000
                if delta_ms <= INACTIVE_THRESHOLD_MS:
                    continue

                logger.warning(
                    "Live %s abandonada — finalizando automaticamente", live.id
                )
                row = await session.get(Live, live.id)
                if row and row.status == LiveStatus.LIVE.value:
                    row.status = LiveStatus.FINISHED.value
                    row.ended_at = datetime.now(timezone.utc)
                    await rc.mark_stream_inactive(r, live.stream_key)
                    finished += 1

            if finished:
                logger.info("%s live(s) abandonada(s) finalizada(s)", finished)
