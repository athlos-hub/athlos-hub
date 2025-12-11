from fastapi import APIRouter
from database.client import db
from sqlalchemy.ext.asyncio import AsyncSession

async def get_session() -> AsyncSession:
    async with db.session() as session:
        yield session

from .modality_routes import router as modality_router
from .competitions_routes import router as competitions_router

router = APIRouter()

router.include_router(modality_router)
router.include_router(competitions_router)