from __future__ import annotations

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.http import auth_client
from src.models import Follow, OrganizationFollow, OrganizationProfile, Post, TeamFollow, TeamProfile
from src.services.context.context_service import list_user_org_slugs, resolve_team_membership
from src.services.posts.post_visibility import VIS_FOLLOWERS, VIS_MEMBERS_ONLY, VIS_PUBLIC

VIS_FOLLOWER_ATHLETE = (VIS_PUBLIC, VIS_FOLLOWERS)


async def following_feed(
    session: AsyncSession,
    keycloak_id: str,
    page: int,
    size: int,
    authorization: str,
) -> tuple[list[Post], int]:
    """
    Posts de perfis seguidos (atleta, org, time) respeitando visibilidade:
    - Próprio atleta: todas as visibilidades.
    - Outros atletas seguidos: PUBLIC e FOLLOWERS.
    - Org seguida: PUBLIC, FOLLOWERS; MEMBERS_ONLY se membro da org.
    - Time seguido: PUBLIC, FOLLOWERS; MEMBERS_ONLY se membro do time (lista /teams/me).
    """
    following_users = (
        await session.scalars(
            select(Follow.following_keycloak_id).where(
                Follow.follower_keycloak_id == keycloak_id
            )
        )
    ).all()
    athlete_ids = list(following_users) + [keycloak_id]
    following_athletes_only = [a for a in athlete_ids if a != keycloak_id]

    org_slugs = (
        await session.scalars(
            select(OrganizationFollow.organization_slug).where(
                OrganizationFollow.follower_keycloak_id == keycloak_id
            )
        )
    ).all()
    org_list = list(org_slugs)
    if org_list:
        approved_slugs = (
            await session.scalars(
                select(OrganizationProfile.organization_slug).where(
                    OrganizationProfile.organization_slug.in_(org_list),
                    OrganizationProfile.approved_for_social.is_(True),
                )
            )
        ).all()
        org_list = list(approved_slugs)

    team_ids_raw = (
        await session.scalars(
            select(TeamFollow.team_id).where(
                TeamFollow.follower_keycloak_id == keycloak_id
            )
        )
    ).all()
    team_list = list(team_ids_raw)
    if team_list:
        approved_teams = (
            await session.scalars(
                select(TeamProfile.team_id).where(
                    TeamProfile.team_id.in_(team_list),
                    TeamProfile.approved_for_social.is_(True),
                )
            )
        ).all()
        team_list = list(approved_teams)

    member_org_slugs: set[str] = set()
    try:
        member_org_slugs = set(await list_user_org_slugs(authorization))
    except Exception:
        member_org_slugs = set()

    member_team_ids: set[str] = set()
    try:
        teams = await auth_client.get_my_teams(authorization)
        member_team_ids = {str(t.get("id")) for t in teams if t.get("id")}
    except Exception:
        member_team_ids = set()

    team_sees_members_only: dict[str, bool] = {}
    for tid in team_list:
        if tid in member_team_ids:
            team_sees_members_only[tid] = True
        else:
            team_sees_members_only[tid] = await resolve_team_membership(
                tid, keycloak_id, authorization
            )

    clauses: list = []

    clauses.append(
        and_(Post.profile_type == "ATHLETE", Post.profile_id == keycloak_id)
    )

    if following_athletes_only:
        clauses.append(
            and_(
                Post.profile_type == "ATHLETE",
                Post.profile_id.in_(following_athletes_only),
                Post.visibility.in_(VIS_FOLLOWER_ATHLETE),
            )
        )

    for slug in org_list:
        vis = [VIS_PUBLIC, VIS_FOLLOWERS]
        if slug in member_org_slugs:
            vis.append(VIS_MEMBERS_ONLY)
        clauses.append(
            and_(
                Post.profile_type == "ORGANIZATION",
                Post.profile_id == slug,
                Post.visibility.in_(vis),
            )
        )

    for tid in team_list:
        vis = [VIS_PUBLIC, VIS_FOLLOWERS]
        if team_sees_members_only.get(tid):
            vis.append(VIS_MEMBERS_ONLY)
        clauses.append(
            and_(
                Post.profile_type == "TEAM",
                Post.profile_id == tid,
                Post.visibility.in_(vis),
            )
        )

    if not clauses:
        return [], 0

    combined = or_(*clauses)
    stmt = select(Post).where(combined).order_by(Post.created_at.desc())
    total = int(
        await session.scalar(select(func.count()).select_from(Post).where(combined)) or 0
    )
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total
