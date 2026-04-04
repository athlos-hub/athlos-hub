from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Follow, OrganizationFollow, Post


async def following_feed(
    session: AsyncSession, keycloak_id: str, page: int, size: int
) -> tuple[list[Post], int]:
    following_users = (
        await session.scalars(
            select(Follow.following_keycloak_id).where(
                Follow.follower_keycloak_id == keycloak_id
            )
        )
    ).all()
    athlete_ids = list(following_users) + [keycloak_id]

    org_slugs = (
        await session.scalars(
            select(OrganizationFollow.organization_slug).where(
                OrganizationFollow.follower_keycloak_id == keycloak_id
            )
        )
    ).all()
    org_list = list(org_slugs)

    posts: list[Post] = []
    if athlete_ids:
        ap = (
            await session.scalars(
                select(Post)
                .where(
                    Post.profile_type == "ATHLETE",
                    Post.profile_id.in_(athlete_ids),
                    Post.visibility == "PUBLIC",
                )
                .order_by(Post.created_at.desc())
            )
        ).all()
        posts.extend(ap)
    if org_list:
        op = (
            await session.scalars(
                select(Post)
                .where(
                    Post.profile_type == "ORGANIZATION",
                    Post.profile_id.in_(org_list),
                    Post.visibility == "PUBLIC",
                )
                .order_by(Post.created_at.desc())
            )
        ).all()
        posts.extend(op)

    posts.sort(key=lambda p: p.created_at, reverse=True)
    total = len(posts)
    chunk = posts[page * size : page * size + size]
    return chunk, total
