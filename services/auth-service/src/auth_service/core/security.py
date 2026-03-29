from auth_service.common.security.roles import RoleChecker


def require_role(roles: list[str]) -> RoleChecker:
    """Requer um ou mais papéis do realm (headers X-Keycloak-Roles definidos pelo Kong)."""

    return RoleChecker(allowed_roles=roles)
