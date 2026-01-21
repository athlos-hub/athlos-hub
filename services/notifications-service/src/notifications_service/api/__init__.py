"""Inicialização da API."""

from notifications_service.api.routes import notification_router, health_router

__all__ = ["notification_router", "health_router"]
