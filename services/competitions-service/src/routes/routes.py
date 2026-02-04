from fastapi import APIRouter
from database.client import db
from sqlalchemy.ext.asyncio import AsyncSession

async def get_session() -> AsyncSession:
    async with db.session() as session:
        yield session

from .modality_routes import router as modality_router
from .competitions_routes import router as competitions_router
from .team_routes import router as team_router
from .matches_routes import router as matches_router
from .health_routes import router as health_router
from .scoreboard_routes import router as scoreboard_router
from .ranking_routes import router as ranking_router
from .stats_ruleset_routes import router as stats_ruleset_router
from .sport_ruleset_routes import router as sport_ruleset_router
from .internal_routes import router as internal_router

router = APIRouter(prefix="/api/v1")

router.include_router(modality_router)
router.include_router(competitions_router)
router.include_router(team_router)
router.include_router(matches_router)
router.include_router(health_router)
router.include_router(scoreboard_router)
router.include_router(ranking_router)
router.include_router(stats_ruleset_router)
router.include_router(sport_ruleset_router)
router.include_router(internal_router)