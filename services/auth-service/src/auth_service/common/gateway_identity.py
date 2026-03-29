"""Identidade propagada pelo Kong (e bypass controlado para testes)."""

from auth_service.core.config import settings


def resolve_gateway_sub(
    x_keycloak_sub: str | None,
    x_test_sub: str | None,
) -> str | None:
    kc = (x_keycloak_sub or "").strip()
    if kc:
        return kc
    if not settings.TRUST_GATEWAY and settings.ENV != "prod":
        t = (x_test_sub or "").strip()
        if t:
            return t
    return None


def resolve_gateway_roles(
    x_keycloak_roles: str | None,
    x_test_roles: str | None,
) -> str | None:
    kc = (x_keycloak_roles or "").strip()
    if kc:
        return kc
    if not settings.TRUST_GATEWAY and settings.ENV != "prod":
        t = (x_test_roles or "").strip()
        if t:
            return t
    return None
