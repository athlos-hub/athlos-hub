from common.security.roles import RoleChecker

from auth_service.core.config import settings
from auth_service.domain.services.auth_service import AuthService


def require_role(roles: list[str]) -> RoleChecker:
    return RoleChecker(
        allowed_roles=roles,
        public_key=AuthService.get_public_key,
        audience=settings.KEYCLOAK_CLIENT_ID,
        issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}",
    )
