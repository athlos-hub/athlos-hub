import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configurações e Banco
from src.config.settings import settings
from database.client import db 
# Rotas
from src.routes import routes

# Middlewares e Common (Descomente quando tiver as libs compartilhadas)
from common.logging import setup_logging, RequestLoggerMiddleware
from common.api.handlers import register_exception_handlers

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup de Logging
    setup_logging(log_level_str=settings.LOG_LEVEL, env=settings.ENV)
    
    startup_logger = logging.getLogger("app.startup")
    
    try:
        startup_logger.info("Inicializando conexão com banco de dados Competitions...")

        # Inicializa o DatabaseClient (Async)
        db.init(
            url=settings.DATABASE_URL,
            pool_min=settings.DB_POOL_MIN_SIZE,
            pool_max=settings.DB_POOL_MAX_SIZE,
            timeout=settings.DB_POOL_TIMEOUT,
            connect_args={"server_settings": {"search_path": f"{settings.COMPETITIONS_DATABASE_SCHEMA},public"}} 
        )
        
        # Verifica saúde do banco
        await db.check_health()
        startup_logger.info("Banco de dados conectado com sucesso.")

    except Exception as e:
        startup_logger.critical(f"Falha crítica no startup: {e}")
        raise e

    yield

    # Shutdown
    startup_logger.info("Encerrando aplicação...")
    try:
        await db.close()
        startup_logger.info("Conexões fechadas.")
    except Exception as e:
        startup_logger.error(f"Erro ao fechar recursos: {e}")


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