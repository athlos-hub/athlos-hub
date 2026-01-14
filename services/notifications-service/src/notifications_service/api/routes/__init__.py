"""Inicialização das rotas."""

from notifications_service.api.routes.notification_routes import router as notification_router
from notifications_service.api.routes.health_routes import router as health_router

__all__ = ["notification_router", "health_router"]
