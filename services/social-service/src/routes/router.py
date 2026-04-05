from fastapi import APIRouter

from src.routes import health
from src.routes.context.router import router as context_router
from src.routes.deps import get_session
from src.routes.feed.router import router as feed_router
from src.routes.internal_router import router as internal_router
from src.routes.follows.router import router as follows_router
from src.routes.interactions.router import router as interactions_router
from src.routes.posts.router import router as posts_router
from src.routes.posts_read.router import router as posts_read_router
from src.routes.profiles.router import router as profiles_router

router = APIRouter(prefix="/api/social", tags=["social"])

for sub in (
    health.router,
    internal_router,
    profiles_router,
    feed_router,
    posts_router,
    posts_read_router,
    interactions_router,
    follows_router,
    context_router,
):
    router.include_router(sub)

__all__ = ["router", "get_session"]
