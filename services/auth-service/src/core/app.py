from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from ..config.settings import settings
from common.logging import setup_logging, RequestLoggerMiddleware
from common.api.handlers import register_exception_handlers
from database.client import db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(
        log_level_str=settings.LOG_LEVEL,
        env=settings.ENV
    )

    startup_logger = logging.getLogger("app.startup")

    try:
        startup_logger.info("Inicializando conexão com banco de dados...")

        db.init(
            url=settings.DATABASE_URL,
            pool_min=settings.DB_POOL_MIN_SIZE,
            pool_max=settings.DB_POOL_MAX_SIZE,
            timeout=settings.DB_POOL_TIMEOUT,
            connect_args={
                "server_settings": {
                    "search_path": f"{settings.KEYCLOAK_DATABASE_SCHEMA},public"
                }
            }
        )
        await db.check_health()

        startup_logger.info("Banco de dados conectado com sucesso")

    except Exception as e:
        startup_logger.critical(f"Falha crítica no startup: {e}")
        raise e

    yield

    startup_logger.info("Encerrando aplicação...")
    try:
        await db.close()
        startup_logger.info("Conexões fechadas.")
    except Exception as e:
        startup_logger.error(f"Erro ao fechar recursos: {e}")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Keycloak Authentication API",
        description="API de autenticação Keycloak + keycloak_schema",
        version="3.0.0",
        lifespan=lifespan
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
        always_log_paths=['/auth', '/login']
    )

    register_exception_handlers(app)

    return app