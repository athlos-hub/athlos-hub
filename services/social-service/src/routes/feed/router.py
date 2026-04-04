"""Router para feed."""

from fastapi import APIRouter

from . import feed

router = APIRouter(tags=["feed"])
router.include_router(feed.router)

__all__ = ["router"]
