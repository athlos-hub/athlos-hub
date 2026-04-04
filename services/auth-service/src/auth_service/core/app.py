import asyncio
import logging
from contextlib import asynccontextmanager

from auth_service.common.api.handlers import register_exception_handlers
from auth_service.common.logging import RequestLoggerMiddleware, setup_logging
from auth_service.infrastructure.database.client import db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth_service.api.router import api_router
from auth_service.core.config import settings
from auth_service.infrastructure.email_consumer import email_consumer_loop
from auth_service.infrastructure.email_publisher import close_email_publisher
from auth_service.infrastructure.notification_publisher import close_notification_publisher
from auth_service.infrastructure.social_profile_publisher import (
    close_social_profile_publisher,
)
from auth_service.infrastructure.team_logo_publisher import close_team_logo_publisher
from auth_service.startup.realm_role_user_bootstrap import (
    bootstrap_local_users_from_realm_role,
)

logger = logging.getLogger(__name__)

# JWT validation is handled exclusively by Kong Gateway.
# This service trusts X-Keycloak-* headers injected by Kong.
# Do NOT add JWT validation middleware here — it breaks the single-responsibility contract.


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerenciador de contexto para o ciclo de vida da aplicação."""

    setup_logging(
        service_name="auth-service",
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

        try:
            await bootstrap_local_users_from_realm_role()
        except Exception as e:
            startup_logger.warning(
                "Bootstrap de usuários (realm role) não concluído: %s", e
            )

    except Exception as e:
        startup_logger.critical("Falha crítica no startup: %s", e)
        raise

    stop_mail = asyncio.Event()
    email_consumer_task: asyncio.Task | None = None
    if settings.RABBITMQ_URL:
        email_consumer_task = asyncio.create_task(email_consumer_loop(stop_mail))

    yield

    startup_logger.info("Encerrando aplicação...")
    if email_consumer_task:
        stop_mail.set()
        email_consumer_task.cancel()
        try:
            await email_consumer_task
        except asyncio.CancelledError:
            pass
    try:
        await close_team_logo_publisher()
    except Exception as e:
        startup_logger.error("Erro ao fechar publisher de escudo: %s", e)
    try:
        await close_email_publisher()
    except Exception as e:
        startup_logger.error("Erro ao fechar publisher de e-mail: %s", e)
    try:
        await close_notification_publisher()
    except Exception as e:
        startup_logger.error("Erro ao fechar RabbitMQ publisher: %s", e)
    try:
        await close_social_profile_publisher()
    except Exception as e:
        startup_logger.error("Erro ao fechar publisher social profiles: %s", e)
    try:
        await db.close()
    except Exception as e:
        startup_logger.error("Erro ao fechar recursos: %s", e)


def create_app() -> FastAPI:
    """Cria a aplicação FastAPI."""

    app = FastAPI(
        title="Keycloak Authentication API",
        description="API de autenticação Keycloak",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(
        RequestLoggerMiddleware,
        service_name="auth-service",
        always_log_paths=["/auth", "/login"],
    )

    register_exception_handlers(app)

    app.include_router(api_router, prefix="/api")

    return app
