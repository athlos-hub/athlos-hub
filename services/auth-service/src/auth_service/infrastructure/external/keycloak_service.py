"""Implementação do serviço de administração do Keycloak."""

import logging
from typing import Any, Optional

from fastapi.concurrency import run_in_threadpool
from keycloak import KeycloakAdmin

from auth_service.core.config import settings
from auth_service.domain.interfaces.external_services import IKeycloakService

logger = logging.getLogger(__name__)


def _get_keycloak_admin() -> KeycloakAdmin:
    """Cria uma nova instância de KeycloakAdmin."""
    return KeycloakAdmin(
        server_url=settings.KEYCLOAK_URL,
        client_id=settings.KEYCLOAK_CLIENT_ID,
        client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
        realm_name=settings.KEYCLOAK_REALM,
        user_realm_name=settings.KEYCLOAK_REALM,
        verify=True,
    )


class KeycloakAdminService(IKeycloakService):
    """Implementação do serviço de administração do Keycloak."""

    async def check_username_exists(
        self, username: str, exclude_keycloak_id: Optional[str] = None
    ) -> bool:
        """Verifica se o nome de usuário existe no Keycloak."""
        keycloak_admin = _get_keycloak_admin()
        users = await run_in_threadpool(
            keycloak_admin.get_users, query={"username": username, "exact": True}
        )
        if not users:
            return False
        if exclude_keycloak_id:
            return any(u.get("id") != exclude_keycloak_id for u in users)
        return True

    async def update_user(self, keycloak_id: str, data: dict[str, Any]) -> None:
        """Atualiza usuário no Keycloak."""
        keycloak_admin = _get_keycloak_admin()
        await run_in_threadpool(keycloak_admin.update_user, keycloak_id, data)
        logger.info(
            f"Usuário {keycloak_id} atualizado no Keycloak: {list(data.keys())}"
        )

    async def get_users_by_email(self, email: str) -> list[dict[str, Any]]:
        """Obtém usuários por email do Keycloak."""
        keycloak_admin = _get_keycloak_admin()
        return await run_in_threadpool(
            keycloak_admin.get_users, query={"email": email, "exact": True}
        )

    async def get_users_by_username(self, username: str) -> list[dict[str, Any]]:
        """Obtém usuários por nome de usuário do Keycloak."""
        keycloak_admin = _get_keycloak_admin()
        return await run_in_threadpool(
            keycloak_admin.get_users, query={"username": username, "exact": True}
        )

    async def create_user(self, user_data: dict[str, Any]) -> str:
        """Cria usuário no Keycloak e retorna o ID do usuário."""
        keycloak_admin = _get_keycloak_admin()
        return await run_in_threadpool(keycloak_admin.create_user, user_data)
