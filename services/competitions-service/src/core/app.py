import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configurações e Banco
from src.config.settings import settings
from src.routes import routes
from shared.database.client import db
from shared.api.handlers import register_exception_handlers
from shared.logging import RequestLoggerMiddleware, setup_logging
from src.infrastructure.messaging.live_match_publisher import close_live_match_publisher
from src.infrastructure.messaging.logo_sync_consumer import logo_sync_consumer_loop
from src.infrastructure.messaging.social_achievement_publisher import (
    close_social_achievement_publisher,
)
from src.infrastructure.messaging.social_team_profile_publisher import (
    close_social_team_profile_publisher,
)
from src.infrastructure.messaging.teams_import_consumer import teams_import_consumer_loop
from src.infrastructure.notification_publisher import close_notification_publisher

# JWT validation is handled exclusively by Kong Gateway.
# This service trusts X-Keycloak-Sub injected by Kong.
# Do NOT add JWT validation here — it breaks the single-responsibility contract.


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(
        service_name="competitions-service",
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
        startup_logger.critical("Falha crítica no startup: %s", e)
        raise

    stop_teams = asyncio.Event()
    stop_logo = asyncio.Event()
    teams_consumer_task: asyncio.Task | None = None
    logo_consumer_task: asyncio.Task | None = None
    if settings.RABBITMQ_URL:
        teams_consumer_task = asyncio.create_task(teams_import_consumer_loop(stop_teams))
        startup_logger.info("Consumer RabbitMQ: teams-import ativo.")
        logo_consumer_task = asyncio.create_task(logo_sync_consumer_loop(stop_logo))
        startup_logger.info("Consumer RabbitMQ: logo-sync ativo.")

    yield

    if teams_consumer_task:
        stop_teams.set()
        teams_consumer_task.cancel()
        try:
            await teams_consumer_task
        except asyncio.CancelledError:
            pass
    if logo_consumer_task:
        stop_logo.set()
        logo_consumer_task.cancel()
        try:
            await logo_consumer_task
        except asyncio.CancelledError:
            pass
    try:
        await close_social_achievement_publisher()
    except Exception as e:
        startup_logger.error("Erro ao fechar publisher social (conquistas): %s", e)
    try:
        await close_social_team_profile_publisher()
    except Exception as e:
        startup_logger.error("Erro ao fechar publisher social (perfis de time): %s", e)
    try:
        await close_live_match_publisher()
    except Exception as e:
        startup_logger.error("Erro ao fechar publisher live: %s", e)
    try:
        await close_notification_publisher()
    except Exception as e:
        startup_logger.error("Erro ao fechar RabbitMQ publisher: %s", e)
    try:
        await db.close()
    except Exception as e:
        startup_logger.error("Erro ao fechar recursos: %s", e)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Competitions Service API",
        description="API de gestão de campeonatos e partidas",
        version="1.0.0",
        lifespan=lifespan
    )

    # --- Middlewares ---

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Logging Middleware
    app.add_middleware(
        RequestLoggerMiddleware,
        service_name="competitions-service",
        always_log_paths=["/competitions"],
    )

    # Exception Handlers
    register_exception_handlers(app)

    # --- Rotas ---
    app.include_router(routes.router)

    return app