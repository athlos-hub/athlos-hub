from __future__ import annotations

import httpx
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.infrastructure.http import auth_client
from src.infrastructure.notifications import send_notification
from src.models import (
    AthleteProfile,
    Follow,
    OrganizationFollow,
    OrganizationProfile,
    TeamFollow,
    TeamProfile,
)


async def _notify_follow(
    target_keycloak: str, actor_keycloak: str, authorization: str
) -> None:
    rid = await auth_client.resolve_internal_user_id(target_keycloak, authorization)
    if not rid:
        return
    try:
        actor = await auth_client.get_user_by_keycloak_id(actor_keycloak, authorization)
        name = actor.get("full_name") or actor.get("username") or "Usuário"
    except Exception:
        name = "Usuário"
    await send_notification(
        recipient_internal_user_id=str(rid),
        actor_keycloak_id=actor_keycloak,
        notification_type="follow",
        title=f"{name} começou a seguir você",
        message=f"{name} começou a seguir você",
        extra_data={
            "actorName": name,
            "actorProfileUrl": f"https://athlos-hub.com/profile/{actor_keycloak}",
            "actionUrl": f"https://athlos-hub.com/profile/{actor_keycloak}",
        },
        entity_id=None,
    )


async def toggle_follow(
    session: AsyncSession, follower: str, target: str, authorization: str
) -> bool:
    if follower == target:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Você não pode seguir a si mesmo")

    existing = await session.scalar(
        select(Follow).where(
            Follow.follower_keycloak_id == follower,
            Follow.following_keycloak_id == target,
        )
    )
    if existing:
        await session.delete(existing)
        fa = await session.scalar(
            select(AthleteProfile).where(AthleteProfile.keycloak_id == follower)
        )
        ta = await session.scalar(
            select(AthleteProfile).where(AthleteProfile.keycloak_id == target)
        )
        if fa:
            fa.following_count = max(0, fa.following_count - 1)
        if ta:
            ta.followers_count = max(0, ta.followers_count - 1)
        return False

    session.add(
        Follow(follower_keycloak_id=follower, following_keycloak_id=target)
    )
    await session.flush()
    fa = await session.scalar(
        select(AthleteProfile).where(AthleteProfile.keycloak_id == follower)
    )
    ta = await session.scalar(
        select(AthleteProfile).where(AthleteProfile.keycloak_id == target)
    )
    if fa:
        fa.following_count = fa.following_count + 1
    if ta:
        ta.followers_count = ta.followers_count + 1

    await _notify_follow(target, follower, authorization)
    return True


async def is_following(session: AsyncSession, follower: str, target: str) -> bool:
    q = await session.scalar(
        select(func.count())
        .select_from(Follow)
        .where(
            Follow.follower_keycloak_id == follower,
            Follow.following_keycloak_id == target,
        )
    )
    return bool(q)


async def list_followers(
    session: AsyncSession, keycloak_id: str, page: int, size: int
) -> tuple[list[str], int]:
    stmt = (
        select(Follow.follower_keycloak_id)
        .where(Follow.following_keycloak_id == keycloak_id)
        .order_by(Follow.created_at.desc())
    )
    total = int(
        await session.scalar(
            select(func.count())
            .select_from(Follow)
            .where(Follow.following_keycloak_id == keycloak_id)
        )
        or 0
    )
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total


async def list_following(
    session: AsyncSession, keycloak_id: str, page: int, size: int
) -> tuple[list[str], int]:
    stmt = (
        select(Follow.following_keycloak_id)
        .where(Follow.follower_keycloak_id == keycloak_id)
        .order_by(Follow.created_at.desc())
    )
    total = int(
        await session.scalar(
            select(func.count())
            .select_from(Follow)
            .where(Follow.follower_keycloak_id == keycloak_id)
        )
        or 0
    )
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total


async def toggle_org_follow(
    session: AsyncSession,
    follower: str,
    org_slug: str,
    authorization: str,
    org_name: str | None = None,
) -> bool:
    op = await session.scalar(
        select(OrganizationProfile).where(
            OrganizationProfile.organization_slug == org_slug
        )
    )
    existing = await session.scalar(
        select(OrganizationFollow).where(
            OrganizationFollow.follower_keycloak_id == follower,
            OrganizationFollow.organization_slug == org_slug,
        )
    )
    if existing:
        await session.delete(existing)
        ap = await session.scalar(
            select(AthleteProfile).where(AthleteProfile.keycloak_id == follower)
        )
        if ap:
            ap.following_count = max(0, ap.following_count - 1)
        op = await session.scalar(
            select(OrganizationProfile).where(
                OrganizationProfile.organization_slug == org_slug
            )
        )
        if op:
            op.followers_count = max(0, op.followers_count - 1)
        return False

    if not op or not op.approved_for_social:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organização não encontrada")

    session.add(
        OrganizationFollow(
            follower_keycloak_id=follower, organization_slug=org_slug
        )
    )
    await session.flush()
    ap = await session.scalar(
        select(AthleteProfile).where(AthleteProfile.keycloak_id == follower)
    )
    if ap:
        ap.following_count = ap.following_count + 1
    op = await session.scalar(
        select(OrganizationProfile).where(
            OrganizationProfile.organization_slug == org_slug
        )
    )
    if op:
        op.followers_count = op.followers_count + 1

    try:
        org = await auth_client.get_organization_by_slug(org_slug, authorization)
        owner_id = org.get("owner_id")
        try:
            actor = await auth_client.get_user_by_keycloak_id(follower, authorization)
            name = actor.get("full_name") or actor.get("username") or "Usuário"
        except Exception:
            name = "Usuário"
        if owner_id:
            base = settings.AUTH_SERVICE_URL.rstrip("/")
            async with httpx.AsyncClient(timeout=settings.AUTH_SERVICE_TIMEOUT) as client:
                ur = await client.get(
                    f"{base}/api/users/{owner_id}",
                    headers={"Authorization": authorization},
                )
                if ur.is_success:
                    owner = ur.json()
                    owner_kc = owner.get("keycloak_id")
                    if owner_kc and owner_kc != follower:
                        rid = await auth_client.resolve_internal_user_id(
                            str(owner_kc), authorization
                        )
                        if rid:
                            await send_notification(
                                recipient_internal_user_id=str(rid),
                                actor_keycloak_id=follower,
                                notification_type="organization_follow",
                                title=f"{name} seguiu a organização",
                                message=f"{name} seguiu a organização",
                                extra_data={
                                    "actorName": name,
                                    "organizationName": org_name
                                    or org.get("name")
                                    or org_slug,
                                },
                                entity_id=None,
                            )
    except Exception:
        pass
    return True


async def is_org_following(session: AsyncSession, follower: str, org_slug: str) -> bool:
    op = await session.scalar(
        select(OrganizationProfile).where(
            OrganizationProfile.organization_slug == org_slug
        )
    )
    if not op or not op.approved_for_social:
        return False
    q = await session.scalar(
        select(func.count())
        .select_from(OrganizationFollow)
        .where(
            OrganizationFollow.follower_keycloak_id == follower,
            OrganizationFollow.organization_slug == org_slug,
        )
    )
    return bool(q)


async def org_follower_count(session: AsyncSession, org_slug: str) -> int:
    q = await session.scalar(
        select(func.count())
        .select_from(OrganizationFollow)
        .where(OrganizationFollow.organization_slug == org_slug)
    )
    return int(q or 0)


async def list_org_follow_entities(
    session: AsyncSession, org_slug: str, page: int, size: int
) -> tuple[list[OrganizationFollow], int]:
    stmt = (
        select(OrganizationFollow)
        .where(OrganizationFollow.organization_slug == org_slug)
        .order_by(OrganizationFollow.created_at.desc())
    )
    total = await org_follower_count(session, org_slug)
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total


async def list_my_followed_org_entities(
    session: AsyncSession, follower: str, page: int, size: int
) -> tuple[list[OrganizationFollow], int]:
    stmt = (
        select(OrganizationFollow)
        .join(
            OrganizationProfile,
            OrganizationProfile.organization_slug == OrganizationFollow.organization_slug,
        )
        .where(
            OrganizationFollow.follower_keycloak_id == follower,
            OrganizationProfile.approved_for_social.is_(True),
        )
        .order_by(OrganizationFollow.created_at.desc())
    )
    total = int(
        await session.scalar(
            select(func.count())
            .select_from(OrganizationFollow)
            .join(
                OrganizationProfile,
                OrganizationProfile.organization_slug == OrganizationFollow.organization_slug,
            )
            .where(
                OrganizationFollow.follower_keycloak_id == follower,
                OrganizationProfile.approved_for_social.is_(True),
            )
        )
        or 0
    )
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total


async def list_my_org_slugs(session: AsyncSession, follower: str) -> list[str]:
    rows = (
        await session.scalars(
            select(OrganizationFollow.organization_slug).where(
                OrganizationFollow.follower_keycloak_id == follower
            )
        )
    ).all()
    return list(rows)


async def toggle_team_follow(session: AsyncSession, follower: str, team_id: str) -> bool:
    tp = await session.scalar(select(TeamProfile).where(TeamProfile.team_id == team_id))
    existing = await session.scalar(
        select(TeamFollow).where(
            TeamFollow.follower_keycloak_id == follower,
            TeamFollow.team_id == team_id,
        )
    )
    if existing:
        await session.delete(existing)
        ap = await session.scalar(
            select(AthleteProfile).where(AthleteProfile.keycloak_id == follower)
        )
        if ap:
            ap.following_count = max(0, ap.following_count - 1)
        tp = await session.scalar(
            select(TeamProfile).where(TeamProfile.team_id == team_id)
        )
        if tp:
            tp.followers_count = max(0, tp.followers_count - 1)
        return False

    if not tp or not tp.approved_for_social:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Perfil de time não encontrado")

    session.add(TeamFollow(follower_keycloak_id=follower, team_id=team_id))
    await session.flush()
    ap = await session.scalar(
        select(AthleteProfile).where(AthleteProfile.keycloak_id == follower)
    )
    if ap:
        ap.following_count = ap.following_count + 1
    tp = await session.scalar(select(TeamProfile).where(TeamProfile.team_id == team_id))
    if tp:
        tp.followers_count = tp.followers_count + 1
    return True


async def is_team_following(session: AsyncSession, follower: str, team_id: str) -> bool:
    tp = await session.scalar(select(TeamProfile).where(TeamProfile.team_id == team_id))
    if not tp or not tp.approved_for_social:
        return False
    q = await session.scalar(
        select(func.count())
        .select_from(TeamFollow)
        .where(
            TeamFollow.follower_keycloak_id == follower,
            TeamFollow.team_id == team_id,
        )
    )
    return bool(q)


async def team_follower_count(session: AsyncSession, team_id: str) -> int:
    q = await session.scalar(
        select(func.count())
        .select_from(TeamFollow)
        .where(TeamFollow.team_id == team_id)
    )
    return int(q or 0)


async def list_team_follow_entities(
    session: AsyncSession, team_id: str, page: int, size: int
) -> tuple[list[TeamFollow], int]:
    stmt = (
        select(TeamFollow)
        .where(TeamFollow.team_id == team_id)
        .order_by(TeamFollow.created_at.desc())
    )
    total = await team_follower_count(session, team_id)
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total
