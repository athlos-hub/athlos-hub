from typing import Annotated, List

from auth_service.common.gateway_identity import resolve_gateway_roles
from fastapi import Header, HTTPException, status


class RoleChecker:
    """Autorização por papéis do realm (via cabeçalhos injetados pelo Kong após validar o JWT).

    JWT validation is handled exclusively by Kong Gateway.
    This service trusts X-Keycloak-Roles injected by Kong.
    Do NOT add JWT validation here — it breaks the single-responsibility contract.
    """

    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = {r.lower() for r in allowed_roles}

    def __call__(
        self,
        x_keycloak_roles: Annotated[str | None, Header(alias="X-Keycloak-Roles")] = None,
        x_test_roles: Annotated[str | None, Header(alias="X-Test-Roles")] = None,
    ) -> None:
        roles_header = resolve_gateway_roles(x_keycloak_roles, x_test_roles)
        if not roles_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: papéis ausentes (esperado após passagem pelo API Gateway).",
            )

        roles = {r.strip().lower() for r in roles_header.split(",") if r.strip()}
        if not roles.intersection(self.allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Requer um dos papéis: {sorted(self.allowed_roles)}",
            )
