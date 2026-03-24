from notifications_service.api.routes.health_routes import router as health_router
from notifications_service.api.routes.notification_routes import router as notification_router

__all__ = ["health_router", "notification_router"]
