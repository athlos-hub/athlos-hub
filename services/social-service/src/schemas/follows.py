from __future__ import annotations

from typing import Any

from src.models import OrganizationFollow, TeamFollow
from src.schemas.common import iso_datetime


def organization_follow_to_camel(f: OrganizationFollow) -> dict[str, Any]:
    return {
        "id": str(f.id),
        "followerKeycloakId": f.follower_keycloak_id,
        "organizationSlug": f.organization_slug,
        "createdAt": iso_datetime(f.created_at),
        "updatedAt": iso_datetime(f.updated_at),
    }


def team_follow_to_camel(f: TeamFollow) -> dict[str, Any]:
    return {
        "id": str(f.id),
        "followerKeycloakId": f.follower_keycloak_id,
        "teamId": f.team_id,
        "createdAt": iso_datetime(f.created_at),
        "updatedAt": iso_datetime(f.updated_at),
    }
