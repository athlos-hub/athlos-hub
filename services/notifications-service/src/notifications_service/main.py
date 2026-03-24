"""Ponto de entrada do serviço de notificações."""

from notifications_service.core.app import create_app
from notifications_service.core.config import settings

app = create_app()


@app.get("/")
async def root():
    return {
        "service": settings.service_name,
        "version": "1.0.0",
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
