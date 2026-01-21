from common.security.roles import RoleChecker

from auth_service.core.config import settings
from auth_service.domain.services.authentication_service import AuthenticationService


def require_role(roles: list[str]) -> RoleChecker:
    """Requer um ou mais papéis para acessar um recurso."""

    return RoleChecker(
        allowed_roles=roles,
        public_key=AuthenticationService.get_public_key,
        audience=settings.KEYCLOAK_CLIENT_ID,
        issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}",
    )
