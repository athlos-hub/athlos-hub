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
from live_service.core.config import settings
from live_service.infrastructure.database.client import db
from live_service.infrastructure.redis_client import redis_client
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
        logging.getLogger("apscheduler").setLevel(logging.WARNING)
        logging.getLogger("tzlocal").setLevel(logging.ERROR)
        db.init(settings.database_url)
        await db.check_health()
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

        yield

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
    app.include_router(api_router, prefix="/api")
    return app


_fastapi_app = create_fastapi_app()
asgi_app = ASGIApp(sio, _fastapi_app)
