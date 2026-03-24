from fastapi import APIRouter

from notifications_service.api.routes import health_router, notification_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(notification_router)
