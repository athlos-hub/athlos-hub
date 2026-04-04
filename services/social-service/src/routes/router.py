from fastapi import APIRouter

from src.routes import (
    athlete_posts,
    comments,
    context as context_routes,
    feed,
    follow_athletes,
    follow_organization,
    follow_team,
    health,
    likes,
    organization_posts,
    posts_read,
    profiles,
    shares,
    team_posts,
)
from src.routes.deps import get_session

router = APIRouter(prefix="/api/social", tags=["social"])

for sub in (
    health.router,
    feed.router,
    posts_read.router,
    profiles.router,
    context_routes.router,
    athlete_posts.router,
    organization_posts.router,
    team_posts.router,
    comments.router,
    likes.router,
    shares.router,
    follow_athletes.router,
    follow_organization.router,
    follow_team.router,
):
    router.include_router(sub)

__all__ = ["router", "get_session"]
