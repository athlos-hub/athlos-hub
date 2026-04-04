"""Fábrica FastAPI + ciclo de vida (DB, Redis, scheduler, Socket.IO)."""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import socketio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from zoneinfo import ZoneInfo
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from socketio import ASGIApp

from live_service.api.router import api_router
from live_service.common.logging import RequestLoggerMiddleware, setup_logging
from live_service.core.config import settings
from live_service.infrastructure.database.client import db
from live_service.infrastructure.redis_client import redis_client
from live_service.infrastructure.messaging.consumer import live_match_consumer_loop
from live_service.services.abandoned_lives_service import AbandonedLivesService
from live_service.sockets.live_namespace import register_live_namespace, start_redis_bridge

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
)
register_live_namespace(sio)


def create_fastapi_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        setup_logging(
            service_name="live-service",
            log_level_str=settings.LOG_LEVEL,
            env=settings.ENV,
            log_format=settings.LOG_FORMAT,
            show_banner=settings.LOG_STARTUP_BANNER,
        )
        startup_logger = logging.getLogger("app.startup")

        logging.getLogger("apscheduler").setLevel(logging.WARNING)
        logging.getLogger("tzlocal").setLevel(logging.ERROR)

        db.init(settings.database_url)
        await db.check_health()
        startup_logger.info("Base de dados conectada.")
        await redis_client.connect()

        abandoned = AbandonedLivesService()
        scheduler = AsyncIOScheduler(timezone=ZoneInfo("UTC"))
        scheduler.add_job(
            abandoned.check_abandoned_lives,
            "interval",
            minutes=5,
            id="abandoned_lives",
            replace_existing=True,
        )
        scheduler.start()

        bridge_task = start_redis_bridge(sio)

        stop_mq = asyncio.Event()
        mq_task: asyncio.Task | None = None
        if settings.rabbitmq_url.strip():
            mq_task = asyncio.create_task(live_match_consumer_loop(stop_mq))
            startup_logger.info("Consumer RabbitMQ: live-match ativo.")

        yield

        if mq_task:
            stop_mq.set()
            mq_task.cancel()
            try:
                await mq_task
            except asyncio.CancelledError:
                pass
        bridge_task.cancel()
        try:
            await bridge_task
        except asyncio.CancelledError:
            pass
        scheduler.shutdown(wait=False)
        await redis_client.close()
        await db.close()

    app = FastAPI(
        title="Live Service",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(
        RequestLoggerMiddleware,
        service_name="live-service",
        always_log_paths=["/api"],
    )
    app.include_router(api_router, prefix="/api")
    return app


_fastapi_app = create_fastapi_app()
asgi_app = ASGIApp(sio, _fastapi_app)
