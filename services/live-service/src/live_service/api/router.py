from fastapi import APIRouter

from live_service.api.routes import (
    event_routes,
    google_calendar_routes,
    health_routes,
    live_routes,
    webhook_routes,
)

api_router = APIRouter()

api_router.include_router(health_routes.router)
api_router.include_router(live_routes.router)
api_router.include_router(event_routes.router)
api_router.include_router(webhook_routes.router)
api_router.include_router(google_calendar_routes.router)
api_router.include_router(google_calendar_routes.oauth_router)
