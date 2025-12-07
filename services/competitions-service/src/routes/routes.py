from fastapi import APIRouter

from .modality_routes import router as modality_router

router = APIRouter()

router.include_router(modality_router)