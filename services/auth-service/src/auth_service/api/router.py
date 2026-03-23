from fastapi import APIRouter

from auth_service.api.routes import admin, auth, health, internal, organizations, teams, users

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(organizations.router)
api_router.include_router(teams.router)
api_router.include_router(admin.router)
api_router.include_router(internal.router)
