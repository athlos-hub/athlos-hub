import logging
from contextlib import asynccontextmanager

from notifications_service.common.api.handlers import register_exception_handlers
from notifications_service.common.logging import RequestLoggerMiddleware, setup_logging
from notifications_service.infrastructure.database.client import db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from notifications_service.api.router import api_router
from notifications_service.core.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(log_level_str=settings.LOG_LEVEL, env=settings.ENV)
    startup_logger = logging.getLogger("app.startup")
    try:
        startup_logger.info("Inicializando banco de notificações...")
        connect_args: dict = {}
        if settings.notifications_database_schema:
            connect_args = {
                "server_settings": {
                    "search_path": f"{settings.notifications_database_schema},public"
                }
            }
        db.init(
            url=settings.database_url,
            pool_min=5,
            pool_max=10,
            timeout=30,
            connect_args=connect_args,
        )
        await db.check_health()
        startup_logger.info("Banco conectado.")
    except Exception as e:
        startup_logger.critical("Falha no startup: %s", e)
        raise
    yield
    startup_logger.info("Encerrando...")
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
    app.add_middleware(RequestLoggerMiddleware)
    register_exception_handlers(app)
    app.include_router(api_router, prefix="/api/v1")
    return app
