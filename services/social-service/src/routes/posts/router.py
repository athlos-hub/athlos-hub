"""Router para posts."""

from fastapi import APIRouter

from . import athlete_posts, organization_posts, team_posts

router = APIRouter(tags=["posts"])
router.include_router(athlete_posts.router)
router.include_router(organization_posts.router)
router.include_router(team_posts.router)

__all__ = ["router"]
