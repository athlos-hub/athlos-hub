from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.moderation.openai_client import assert_content_allowed
from src.models import AthleteProfile, OrganizationProfile, Post, TeamProfile
from src.services.profiles.profiles_service import (
    require_org_social_visible,
    require_team_social_visible,
)


async def get_post_or_404(session: AsyncSession, post_id: uuid.UUID) -> Post:
    p = await session.get(Post, post_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post não encontrado")
    return p


async def get_post_for_interaction_or_404(
    session: AsyncSession,
    post_id: uuid.UUID,
    viewer_keycloak_id: str | None,
    viewer_authorization: str | None,
) -> Post:
    """Post acessível para leitura/interação segundo visibilidade e perfil social."""
    from src.services.posts.post_visibility import can_viewer_read_post

    p = await get_post_or_404(session, post_id)
    if p.profile_type == "ORGANIZATION":
        await require_org_social_visible(session, p.profile_id)
    elif p.profile_type == "TEAM":
        await require_team_social_visible(session, p.profile_id)
    if not await can_viewer_read_post(session, p, viewer_keycloak_id, viewer_authorization):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post não encontrado")
    return p


def _public_posts_visibility_clause():
    org_ok = exists(
        select(OrganizationProfile.id).where(
            OrganizationProfile.organization_slug == Post.profile_id,
            OrganizationProfile.approved_for_social.is_(True),
        )
    )
    team_ok = exists(
        select(TeamProfile.id).where(
            TeamProfile.team_id == Post.profile_id,
            TeamProfile.approved_for_social.is_(True),
        )
    )
    return and_(
        Post.visibility == "PUBLIC",
        or_(
            Post.profile_type == "ATHLETE",
            and_(Post.profile_type == "ORGANIZATION", org_ok),
            and_(Post.profile_type == "TEAM", team_ok),
        ),
    )


async def _bump_profile_posts(
    session: AsyncSession, profile_type: str, profile_id: str, delta: int
) -> None:
    if delta == 0:
        return
    if profile_type == "ATHLETE":
        prof = await session.scalar(
            select(AthleteProfile).where(AthleteProfile.keycloak_id == profile_id)
        )
        if prof:
            prof.posts_count = max(0, prof.posts_count + delta)
    elif profile_type == "ORGANIZATION":
        prof = await session.scalar(
            select(OrganizationProfile).where(
                OrganizationProfile.organization_slug == profile_id
            )
        )
        if prof:
            prof.posts_count = max(0, prof.posts_count + delta)
    elif profile_type == "TEAM":
        prof = await session.scalar(select(TeamProfile).where(TeamProfile.team_id == profile_id))
        if prof:
            prof.posts_count = max(0, prof.posts_count + delta)


async def create_post_org_or_team(
    session: AsyncSession,
    *,
    profile_type: str,
    profile_id: str,
    keycloak_id: str,
    content: str,
    media_urls: list[str] | None,
    post_type: str,
    visibility: str,
    metadata: dict[str, Any] | None,
) -> Post:
    if profile_type == "ATHLETE":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Atletas não podem criar posts manualmente",
        )
    if profile_type == "ORGANIZATION":
        await require_org_social_visible(session, profile_id)
    elif profile_type == "TEAM":
        await require_team_social_visible(session, profile_id)
    await assert_content_allowed(content)

    p = Post(
        profile_type=profile_type,
        profile_id=profile_id,
        created_by_keycloak_id=keycloak_id,
        content=content,
        media_urls=media_urls,
        type=post_type,
        visibility=visibility,
        metadata_=metadata,
    )
    session.add(p)
    await session.flush()
    await _bump_profile_posts(session, profile_type, profile_id, 1)
    return p


async def create_achievement_athlete_post(
    session: AsyncSession,
    keycloak_id: str,
    content: str,
    achievement_data: dict[str, Any],
) -> Post:
    p = Post(
        profile_type="ATHLETE",
        profile_id=keycloak_id,
        created_by_keycloak_id="SYSTEM",
        content=content,
        type="ACHIEVEMENT",
        visibility="PUBLIC",
        metadata_=achievement_data,
    )
    session.add(p)
    await session.flush()
    prof = await session.scalar(
        select(AthleteProfile).where(AthleteProfile.keycloak_id == keycloak_id)
    )
    if prof:
        prof.achievements_count = prof.achievements_count + 1
    return p


async def create_achievement_team_post(
    session: AsyncSession,
    team_id: str,
    content: str,
    achievement_data: dict[str, Any],
) -> Post:
    p = Post(
        profile_type="TEAM",
        profile_id=team_id,
        created_by_keycloak_id="SYSTEM",
        content=content,
        type="ACHIEVEMENT",
        visibility="PUBLIC",
        metadata_=achievement_data,
    )
    session.add(p)
    await session.flush()
    tprof = await session.scalar(select(TeamProfile).where(TeamProfile.team_id == team_id))
    if tprof:
        tprof.posts_count = tprof.posts_count + 1
        tprof.achievements_count = tprof.achievements_count + 1
    return p


async def create_athlete_post(
    session: AsyncSession,
    keycloak_id: str,
    content: str,
    media_urls: list[str] | None,
    post_type: str,
    visibility: str,
    metadata: dict[str, Any] | None,
) -> Post:
    prof = await session.scalar(
        select(AthleteProfile).where(AthleteProfile.keycloak_id == keycloak_id)
    )
    if not prof:
        prof = AthleteProfile(keycloak_id=keycloak_id)
        session.add(prof)
        await session.flush()

    await assert_content_allowed(content)

    p = Post(
        profile_type="ATHLETE",
        profile_id=keycloak_id,
        created_by_keycloak_id=keycloak_id,
        content=content,
        media_urls=media_urls,
        type=post_type,
        visibility=visibility,
        metadata_=metadata,
    )
    session.add(p)
    await session.flush()
    prof.posts_count = prof.posts_count + 1
    return p


async def update_post(
    session: AsyncSession,
    post_id: uuid.UUID,
    keycloak_id: str,
    content: str | None,
    media_urls: list[str] | None,
    authorization: str,
) -> Post:
    p = await get_post_for_interaction_or_404(
        session, post_id, keycloak_id, authorization
    )
    if p.created_by_keycloak_id != keycloak_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sem permissão para editar")
    if content is not None:
        await assert_content_allowed(content)
        p.content = content
    if media_urls is not None:
        p.media_urls = media_urls
    return p


async def delete_post_generic(
    session: AsyncSession, post_id: uuid.UUID, keycloak_id: str, authorization: str
) -> None:
    p = await get_post_for_interaction_or_404(
        session, post_id, keycloak_id, authorization
    )
    if p.created_by_keycloak_id != keycloak_id and p.created_by_keycloak_id != "SYSTEM":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sem permissão para deletar")
    await _bump_profile_posts(session, p.profile_type, p.profile_id, -1)
    await session.delete(p)


async def delete_athlete_post(session: AsyncSession, post_id: uuid.UUID, keycloak_id: str) -> None:
    p = await get_post_or_404(session, post_id)
    if p.created_by_keycloak_id != keycloak_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sem permissão")
    if p.profile_type != "ATHLETE":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Este não é um post de atleta")
    await session.delete(p)
    prof = await session.scalar(
        select(AthleteProfile).where(AthleteProfile.keycloak_id == keycloak_id)
    )
    if prof:
        prof.posts_count = max(0, prof.posts_count - 1)


async def share_original_post(
    session: AsyncSession,
    original_id: uuid.UUID,
    keycloak_id: str,
    share_content: str | None,
    share_metadata: dict[str, Any] | None,
    authorization: str,
) -> Post:
    original = await get_post_for_interaction_or_404(
        session, original_id, keycloak_id, authorization
    )
    prof = await session.scalar(
        select(AthleteProfile).where(AthleteProfile.keycloak_id == keycloak_id)
    )
    if not prof:
        prof = AthleteProfile(keycloak_id=keycloak_id)
        session.add(prof)
        await session.flush()

    meta = dict(share_metadata or {})
    meta["sharedPostId"] = str(original_id)
    meta["originalAuthor"] = original.profile_id
    meta["originalProfileType"] = original.profile_type
    sc = share_content or ""
    await assert_content_allowed(sc)

    p = Post(
        profile_type="ATHLETE",
        profile_id=keycloak_id,
        created_by_keycloak_id=keycloak_id,
        content=sc,
        type="SHARED",
        visibility="PUBLIC",
        metadata_=meta,
    )
    session.add(p)
    await session.flush()
    original.shares_count = original.shares_count + 1
    prof.posts_count = prof.posts_count + 1
    return p


async def list_profile_posts(
    session: AsyncSession,
    profile_type: str,
    profile_id: str,
    page: int,
    size: int,
    *,
    viewer_keycloak_id: str | None = None,
    viewer_authorization: str | None = None,
) -> tuple[list[Post], int]:
    from src.services.context.context_service import list_user_org_slugs, resolve_team_membership
    from src.services.posts.post_visibility import (
        _viewer_follows_athlete,
        _viewer_follows_org,
        _viewer_follows_team,
        build_profile_wall_visibility_clause,
    )

    follows_profile = False
    is_org_member = False
    is_team_member = False

    if viewer_keycloak_id:
        if profile_type == "ATHLETE":
            follows_profile = await _viewer_follows_athlete(
                session, viewer_keycloak_id, profile_id
            )
        elif profile_type == "ORGANIZATION":
            follows_profile = await _viewer_follows_org(
                session, viewer_keycloak_id, profile_id
            )
            if viewer_authorization:
                try:
                    slugs = await list_user_org_slugs(viewer_authorization)
                    is_org_member = profile_id in set(slugs)
                except Exception:
                    is_org_member = False
        elif profile_type == "TEAM":
            follows_profile = await _viewer_follows_team(
                session, viewer_keycloak_id, profile_id
            )
            if viewer_authorization:
                try:
                    is_team_member = await resolve_team_membership(
                        profile_id, viewer_keycloak_id, viewer_authorization
                    )
                except Exception:
                    is_team_member = False

    vis_clause = build_profile_wall_visibility_clause(
        profile_type,
        profile_id,
        viewer_keycloak_id=viewer_keycloak_id,
        follows_profile=follows_profile,
        is_org_member=is_org_member,
        is_team_member=is_team_member,
    )

    base_where = and_(
        Post.profile_type == profile_type,
        Post.profile_id == profile_id,
        vis_clause,
    )

    stmt = select(Post).where(base_where).order_by(Post.created_at.desc())
    total = int(
        await session.scalar(select(func.count()).select_from(Post).where(base_where)) or 0
    )
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total


async def list_public_feed(session: AsyncSession, page: int, size: int) -> tuple[list[Post], int]:
    stmt = (
        select(Post)
        .where(_public_posts_visibility_clause())
        .order_by(Post.created_at.desc())
    )
    total = int(await session.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total


async def search_posts(
    session: AsyncSession, q: str, page: int, size: int
) -> tuple[list[Post], int]:
    pattern = f"%{q}%"
    stmt = (
        select(Post)
        .where(
            _public_posts_visibility_clause(),
            func.lower(Post.content).like(func.lower(pattern)),
        )
        .order_by(Post.created_at.desc())
    )
    total = int(await session.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total


async def popular_posts(
    session: AsyncSession, days: int, page: int, size: int
) -> tuple[list[Post], int]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=int(days))
    stmt = (
        select(Post)
        .where(_public_posts_visibility_clause(), Post.created_at >= cutoff)
        .order_by(
            (
                Post.likes_count + Post.comments_count * 2 + Post.shares_count * 3
            ).desc(),
            Post.created_at.desc(),
        )
    )
    total = int(await session.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total
