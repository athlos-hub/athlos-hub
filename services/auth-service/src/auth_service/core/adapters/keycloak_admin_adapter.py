"""Adapter Keycloak baseado no client atual."""

import logging
from typing import Any, Optional

from fastapi.concurrency import run_in_threadpool

from auth_service.core.keycloak_provider import get_keycloak_admin_client
from auth_service.core.ports.keycloak_service import IKeycloakService

logger = logging.getLogger(__name__)


class KeycloakAdminAdapter(IKeycloakService):
    async def check_username_exists(
        self, username: str, exclude_keycloak_id: Optional[str] = None
    ) -> bool:
        keycloak_admin = get_keycloak_admin_client()
        users = await run_in_threadpool(
            keycloak_admin.get_users, query={"username": username, "exact": True}
        )
        if not users:
            return False
        if exclude_keycloak_id:
            return any(u.get("id") != exclude_keycloak_id for u in users)
        return True

    async def update_user(self, keycloak_id: str, data: dict[str, Any]) -> None:
        keycloak_admin = get_keycloak_admin_client()
        await run_in_threadpool(keycloak_admin.update_user, keycloak_id, data)
        logger.info("Keycloak user %s updated: %s", keycloak_id, list(data.keys()))

    async def get_user(self, keycloak_id: str) -> dict[str, Any]:
        keycloak_admin = get_keycloak_admin_client()
        return await run_in_threadpool(keycloak_admin.get_user, keycloak_id)

    async def get_users_by_email(self, email: str) -> list[dict[str, Any]]:
        keycloak_admin = get_keycloak_admin_client()
        return await run_in_threadpool(
            keycloak_admin.get_users, query={"email": email, "exact": True}
        )

    async def get_users_by_username(self, username: str) -> list[dict[str, Any]]:
        keycloak_admin = get_keycloak_admin_client()
        return await run_in_threadpool(
            keycloak_admin.get_users, query={"username": username, "exact": True}
        )

    async def create_user(self, user_data: dict[str, Any]) -> str:
        keycloak_admin = get_keycloak_admin_client()
        return await run_in_threadpool(keycloak_admin.create_user, user_data)

