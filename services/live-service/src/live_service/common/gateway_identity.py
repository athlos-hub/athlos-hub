# JWT validation is handled exclusively by Kong Gateway.
# This service trusts X-Keycloak-Sub injected by Kong.
# Do NOT add JWT validation here — it breaks the single-responsibility contract.

"""Identidade propagada pelo Kong (headers) e bypass controlado em dev."""

from dataclasses import dataclass

from fastapi import HTTPException, Request, status

from live_service.core.config import settings


@dataclass(frozen=True)
class GatewayUser:
    """Utilizador derivado dos headers injetados pelo Kong."""

    sub: str
    email: str
    preferred_username: str
    roles: tuple[str, ...]


def _header_str(request: Request, name: str) -> str:
    v = request.headers.get(name.lower())
    if v is None:
        return ""
    return v.strip()


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


def parse_roles_header(raw: str | None) -> tuple[str, ...]:
    if not raw:
        return ()
    return tuple(r.strip() for r in raw.split(",") if r.strip())


def build_gateway_user(request: Request) -> GatewayUser | None:
    sub = resolve_gateway_sub(
        request.headers.get("X-Keycloak-Sub"),
        request.headers.get("X-Test-Sub"),
    )
    if not sub:
        return None
    email = _header_str(request, "X-Keycloak-Email")
    preferred = _header_str(request, "X-Keycloak-Preferred-Username") or sub
    roles_raw = _header_str(request, "X-Keycloak-Roles")
    if not settings.TRUST_GATEWAY and settings.ENV != "prod":
        test_roles = _header_str(request, "X-Test-Roles")
        if test_roles:
            roles_raw = test_roles
    return GatewayUser(
        sub=sub,
        email=email,
        preferred_username=preferred,
        roles=parse_roles_header(roles_raw),
    )


async def require_gateway_user(request: Request) -> GatewayUser:
    """Dependência FastAPI: exige identidade Kong (ou X-Test-Sub em dev)."""

    user = build_gateway_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado (X-Keycloak-Sub ausente).",
        )
    return user
