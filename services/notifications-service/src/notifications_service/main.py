"""Aplicação principal do serviço de notificações."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from common.logging import setup_logging
from database.client import db
from notifications_service.api import notification_router, health_router
from notifications_service.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação."""
    setup_logging(
        log_level_str="DEBUG" if settings.debug else "INFO",
        env="dev" if settings.debug else "prod",
        log_dir="logs"
    )
    
    startup_logger = logging.getLogger("app.startup")
    startup_logger.info("Iniciando serviço de notificações...")
    
    try:
        connect_args = {}
        if settings.notifications_database_schema:
            connect_args = {"server_settings": {"search_path": f"{settings.notifications_database_schema},public"}}

        db.init(
            url=settings.database_url,
            pool_min=5,
            pool_max=10,
            timeout=30,
            connect_args=connect_args
        )
        
        await db.check_health()
        startup_logger.info("Banco de dados conectado com sucesso.")
        
    except Exception as e:
        startup_logger.critical(f"Falha crítica no startup: {e}")
        raise e
    
    yield
    
    startup_logger.info("Encerrando serviço de notificações...")
    try:
        await db.close()
        startup_logger.info("Banco de dados fechado com sucesso.")
    except Exception as e:
        startup_logger.error(f"Erro ao fechar banco de dados: {e}")


app = FastAPI(
    title="Notifications Service",
    description="Serviço de notificações do Athlos Hub usando Novu",
    version="0.1.0",
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

app.include_router(health_router, prefix="/api/v1")
app.include_router(notification_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Rota raiz."""
    return {
        "service": "notifications-service",
        "version": "0.1.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "notifications_service.main:app",
        host=settings.service_host,
        port=settings.service_port,
        reload=settings.debug,
    )
