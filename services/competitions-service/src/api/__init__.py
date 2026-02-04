"""API module for competitions-service."""

from .deps import (
    get_current_keycloak_id,
    get_current_user_id,  # alias para compatibilidade
    get_optional_keycloak_id,
    RequireOrgPermission,
    require_owner_or_organizer,
    require_owner,
    CurrentUserId,
)

__all__ = [
    "get_current_keycloak_id",
    "get_current_user_id",  # alias para compatibilidade
    "get_optional_keycloak_id",
    "RequireOrgPermission",
    "require_owner_or_organizer",
    "require_owner",
    "CurrentUserId",
]
