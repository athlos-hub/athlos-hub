"""Identidade propagada pelo Kong (X-Keycloak-Sub). Sem validação JWT aqui."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from src.api.gateway import resolve_gateway_sub


def _require_sub(raw: str | None) -> str:
    if not raw or not raw.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado (X-Keycloak-Sub ausente).",
        )
    return raw.strip()


async def get_current_keycloak_id(
    x_keycloak_sub: Annotated[str | None, Header(alias="X-Keycloak-Sub")] = None,
    x_test_sub: Annotated[str | None, Header(alias="X-Test-Sub")] = None,
) -> str:
    raw = resolve_gateway_sub(x_keycloak_sub, x_test_sub)
    return _require_sub(raw)


async def get_optional_keycloak_id(
    x_keycloak_sub: Annotated[str | None, Header(alias="X-Keycloak-Sub")] = None,
    x_test_sub: Annotated[str | None, Header(alias="X-Test-Sub")] = None,
) -> str | None:
    raw = resolve_gateway_sub(x_keycloak_sub, x_test_sub)
    if not raw or not raw.strip():
        return None
    return raw.strip()


async def get_bearer_authorization(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não encontrado",
        )
    return authorization.strip()


async def get_optional_bearer_authorization(
    authorization: Annotated[str | None, Header()] = None,
) -> str | None:
    if authorization and authorization.strip():
        return authorization.strip()
    return None
