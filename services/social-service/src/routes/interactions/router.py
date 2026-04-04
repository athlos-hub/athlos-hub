"""Router para interactions."""

from fastapi import APIRouter

from . import comments, likes, shares

router = APIRouter(tags=["interactions"])
router.include_router(comments.router)
router.include_router(likes.router)
router.include_router(shares.router)

__all__ = ["router"]
