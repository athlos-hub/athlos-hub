import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.api.handlers import register_exception_handlers
from shared.database.client import db
from shared.logging import RequestLoggerMiddleware, setup_logging
from src.config.settings import settings
from src.infrastructure.messaging.achievement_consumer import achievement_consumer_loop
from src.infrastructure.notifications import close_notification_publisher
from src.routes.router import router

logger = logging.getLogger(__name__)

# JWT validation is handled exclusively by Kong Gateway.
# This service trusts X-Keycloak-Sub injected by Kong.


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(
        service_name="social-service",
        log_level_str=settings.LOG_LEVEL,
        env=settings.ENV,
        log_format=settings.LOG_FORMAT,
        show_banner=settings.LOG_STARTUP_BANNER,
    )

    startup_logger = logging.getLogger("app.startup")
    try:
        db.init(
            url=settings.database_url,
            pool_min=settings.DB_POOL_MIN_SIZE,
            pool_max=settings.DB_POOL_MAX_SIZE,
            timeout=settings.DB_POOL_TIMEOUT,
        )
        await db.check_health()
        startup_logger.info("Base de dados conectada.")
    except Exception as e:
        startup_logger.critical("Falha no startup: %s", e)
        raise

    stop_mq = asyncio.Event()
    mq_task: asyncio.Task | None = None
    if settings.RABBITMQ_URL.strip():
        mq_task = asyncio.create_task(achievement_consumer_loop(stop_mq))
        startup_logger.info("Consumer RabbitMQ: conquistas (social) ativo.")

    yield

    if mq_task:
        stop_mq.set()
        mq_task.cancel()
        try:
            await mq_task
        except asyncio.CancelledError:
            pass
    try:
        await close_notification_publisher()
    except Exception as e:
        startup_logger.error("Erro ao fechar publisher de notificações: %s", e)
    try:
        await db.close()
    except Exception as e:
        startup_logger.error("Erro ao fechar DB: %s", e)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Social Service API",
        description="Rede social AthlosHub",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(
        RequestLoggerMiddleware,
        service_name="social-service",
        always_log_paths=["/api/social"],
    )
    register_exception_handlers(app)
    app.include_router(router)
    return app
