"""Regras de visibilidade de posts (mural e feeds)."""

from __future__ import annotations

from sqlalchemy import false, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Follow, OrganizationFollow, Post, TeamFollow

# Valores persistidos no modelo Post.visibility
VIS_PUBLIC = "PUBLIC"
VIS_FOLLOWERS = "FOLLOWERS"
VIS_MEMBERS_ONLY = "MEMBERS_ONLY"
VIS_PRIVATE = "PRIVATE"


def _public_only_clause():
    return Post.visibility == VIS_PUBLIC


async def _viewer_follows_athlete(
    session: AsyncSession, viewer_kid: str, athlete_kid: str
) -> bool:
    if viewer_kid == athlete_kid:
        return True
    q = await session.scalar(
        select(Follow.id).where(
            Follow.follower_keycloak_id == viewer_kid,
            Follow.following_keycloak_id == athlete_kid,
        )
    )
    return q is not None


async def _viewer_follows_org(
    session: AsyncSession, viewer_kid: str, organization_slug: str
) -> bool:
    q = await session.scalar(
        select(OrganizationFollow.id).where(
            OrganizationFollow.follower_keycloak_id == viewer_kid,
            OrganizationFollow.organization_slug == organization_slug,
        )
    )
    return q is not None


async def _viewer_follows_team(
    session: AsyncSession, viewer_kid: str, team_id: str
) -> bool:
    q = await session.scalar(
        select(TeamFollow.id).where(
            TeamFollow.follower_keycloak_id == viewer_kid,
            TeamFollow.team_id == team_id,
        )
    )
    return q is not None


def build_profile_wall_visibility_clause(
    profile_type: str,
    profile_id: str,
    *,
    viewer_keycloak_id: str | None,
    follows_profile: bool,
    is_org_member: bool,
    is_team_member: bool,
):
    """
    Condição SQL para posts visíveis no mural de um perfil.
    Sem viewer autenticado: só público.
    """
    if not viewer_keycloak_id:
        return _public_only_clause()

    if profile_type == "ATHLETE":
        if viewer_keycloak_id == profile_id:
            return true()
        conds = [Post.visibility == VIS_PUBLIC]
        if follows_profile:
            conds.append(Post.visibility == VIS_FOLLOWERS)
        return or_(*conds)

    if profile_type == "ORGANIZATION":
        conds = [Post.visibility == VIS_PUBLIC]
        if follows_profile or is_org_member:
            conds.append(Post.visibility == VIS_FOLLOWERS)
        if is_org_member:
            conds.append(Post.visibility == VIS_MEMBERS_ONLY)
        return or_(*conds)

    if profile_type == "TEAM":
        conds = [Post.visibility == VIS_PUBLIC]
        if follows_profile or is_team_member:
            conds.append(Post.visibility == VIS_FOLLOWERS)
        if is_team_member:
            conds.append(Post.visibility == VIS_MEMBERS_ONLY)
        return or_(*conds)

    return false()


async def can_viewer_read_post(
    session: AsyncSession,
    post: Post,
    viewer_keycloak_id: str | None,
    viewer_authorization: str | None,
) -> bool:
    """Se o utilizador pode ver o conteúdo do post (após checagens de perfil social)."""
    vis = post.visibility or VIS_PUBLIC

    if vis == VIS_PUBLIC:
        return True
    if not viewer_keycloak_id:
        return False

    follows_profile = False
    is_org_member = False
    is_team_member = False

    if post.profile_type == "ATHLETE":
        follows_profile = await _viewer_follows_athlete(
            session, viewer_keycloak_id, post.profile_id
        )
    elif post.profile_type == "ORGANIZATION":
        follows_profile = await _viewer_follows_org(
            session, viewer_keycloak_id, post.profile_id
        )
        if viewer_authorization:
            from src.services.context.context_service import list_user_org_slugs

            try:
                slugs = await list_user_org_slugs(viewer_authorization)
                is_org_member = post.profile_id in set(slugs)
            except Exception:
                is_org_member = False
    elif post.profile_type == "TEAM":
        follows_profile = await _viewer_follows_team(
            session, viewer_keycloak_id, post.profile_id
        )
        if viewer_authorization:
            from src.services.context.context_service import resolve_team_membership

            try:
                is_team_member = await resolve_team_membership(
                    post.profile_id,
                    viewer_keycloak_id,
                    viewer_authorization,
                )
            except Exception:
                is_team_member = False

    if post.profile_type == "ATHLETE":
        if viewer_keycloak_id == post.profile_id:
            return True
        if vis == VIS_FOLLOWERS:
            return follows_profile
        if vis in (VIS_PRIVATE, VIS_MEMBERS_ONLY):
            return False
        return False

    if post.profile_type == "ORGANIZATION":
        if vis == VIS_FOLLOWERS:
            return follows_profile or is_org_member
        if vis == VIS_MEMBERS_ONLY:
            return is_org_member
        return False

    if post.profile_type == "TEAM":
        if vis == VIS_FOLLOWERS:
            return follows_profile or is_team_member
        if vis == VIS_MEMBERS_ONLY:
            return is_team_member
        return False

    return vis == VIS_PUBLIC
