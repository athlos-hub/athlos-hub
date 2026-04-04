"""Router para context."""

from fastapi import APIRouter

from . import context

router = APIRouter(tags=["context"])
router.include_router(context.router)

__all__ = ["router"]
