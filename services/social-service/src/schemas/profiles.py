from __future__ import annotations

from typing import Any

from src.models import AthleteProfile, OrganizationProfile, TeamProfile
from src.schemas.common import iso_datetime


def athlete_profile_to_camel(a: AthleteProfile) -> dict[str, Any]:
    return {
        "id": str(a.id),
        "keycloakId": a.keycloak_id,
        "bio": a.bio,
        "specialization": a.specialization,
        "city": a.city,
        "state": a.state,
        "country": a.country,
        "isVerified": a.is_verified,
        "verifiedAt": iso_datetime(a.verified_at),
        "isPublic": a.is_public,
        "followersCount": a.followers_count,
        "followingCount": a.following_count,
        "postsCount": a.posts_count,
        "achievementsCount": a.achievements_count,
        "socialLinks": a.social_links,
        "achievements": a.achievements,
        "statistics": a.statistics,
        "createdAt": iso_datetime(a.created_at),
        "updatedAt": iso_datetime(a.updated_at),
    }


def org_profile_to_camel(o: OrganizationProfile) -> dict[str, Any]:
    return {
        "id": str(o.id),
        "organizationSlug": o.organization_slug,
        "description": o.description,
        "website": o.website,
        "followersCount": o.followers_count,
        "postsCount": o.posts_count,
        "isVerified": o.is_verified,
        "isPrivate": o.is_private,
        "socialLinks": o.social_links,
        "createdAt": iso_datetime(o.created_at),
        "updatedAt": iso_datetime(o.updated_at),
    }


def team_profile_to_camel(t: TeamProfile) -> dict[str, Any]:
    return {
        "id": str(t.id),
        "teamId": t.team_id,
        "organizationSlug": t.organization_slug,
        "description": t.description,
        "followersCount": t.followers_count,
        "postsCount": t.posts_count,
        "achievementsCount": t.achievements_count,
        "isPrivate": t.is_private,
        "socialLinks": t.social_links,
        "achievements": t.achievements,
        "createdAt": iso_datetime(t.created_at),
        "updatedAt": iso_datetime(t.updated_at),
    }
