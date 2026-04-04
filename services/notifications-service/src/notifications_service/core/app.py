import asyncio
import logging
from contextlib import asynccontextmanager

from notifications_service.common.api.handlers import register_exception_handlers
from notifications_service.common.logging import RequestLoggerMiddleware, setup_logging
from notifications_service.infrastructure.database.client import db
from notifications_service.infrastructure.messaging.consumer import notification_consumer_loop
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from notifications_service.api.router import api_router
from notifications_service.core.config import settings

logger = logging.getLogger(__name__)

# JWT validation is handled exclusively by Kong Gateway.
# This service trusts X-Keycloak-Sub injected by Kong.
# Do NOT add JWT validation here — it breaks the single-responsibility contract.


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(
        service_name=settings.service_name,
        log_level_str=settings.LOG_LEVEL,
        env=settings.ENV,
        log_format=settings.LOG_FORMAT,
        show_banner=settings.LOG_STARTUP_BANNER,
    )
    startup_logger = logging.getLogger("app.startup")
    try:
        db.init(
            url=settings.database_url,
            pool_min=5,
            pool_max=10,
            timeout=30,
        )
        await db.check_health()
        startup_logger.info("Base de dados conectada.")
    except Exception as e:
        startup_logger.critical("Falha no startup: %s", e)
        raise

    stop_consumer = asyncio.Event()
    consumer_task: asyncio.Task | None = None
    if settings.rabbitmq_url:
        consumer_task = asyncio.create_task(notification_consumer_loop(stop_consumer))
        startup_logger.info("Consumer RabbitMQ: notificações ativo.")

    yield

    if consumer_task:
        stop_consumer.set()
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
    try:
        await db.close()
    except Exception as e:
        startup_logger.error("Erro ao fechar DB: %s", e)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Notifications Service",
        description="Notificações in-app (SSE + REST), sem provedor externo.",
        version="1.0.0",
        lifespan=lifespan,
        redirect_slashes=False,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(
        RequestLoggerMiddleware,
        service_name=settings.service_name,
        always_log_paths=["/api"],
    )
    register_exception_handlers(app)
    app.include_router(api_router, prefix="/api")
    return app
