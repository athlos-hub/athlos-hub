"""Router para profiles."""

from fastapi import APIRouter

from . import profiles

router = APIRouter(tags=["profiles"])
router.include_router(profiles.router)

__all__ = ["router"]
