"""Router para follows."""

from fastapi import APIRouter

from . import follow_athletes, follow_organization, follow_team

router = APIRouter(tags=["follows"])
router.include_router(follow_athletes.router)
router.include_router(follow_organization.router)
router.include_router(follow_team.router)

__all__ = ["router"]
