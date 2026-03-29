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

# JWT validation is handled exclusively by Kong Gateway.
# This service trusts X-Keycloak-Sub injected by Kong.
# Do NOT add JWT validation here — it breaks the single-responsibility contract.


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(log_level_str=settings.LOG_LEVEL, env=settings.ENV)

    startup_logger = logging.getLogger("app.startup")

    try:
        db.init(
            url=settings.database_url,
            pool_min=settings.DB_POOL_MIN_SIZE,
            pool_max=settings.DB_POOL_MAX_SIZE,
            timeout=settings.DB_POOL_TIMEOUT,
        )
        await db.check_health()

    except Exception as e:
        startup_logger.critical("Falha crítica no startup: %s", e)
        raise

    yield

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
        always_log_paths=['/competitions']
    )

    # Exception Handlers
    register_exception_handlers(app)

    # --- Rotas ---
    app.include_router(routes.router)
    
    return app