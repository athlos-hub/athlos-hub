"""Router para posts_read."""

from fastapi import APIRouter

from . import posts_read

router = APIRouter(tags=["posts"])
router.include_router(posts_read.router)

__all__ = ["router"]
