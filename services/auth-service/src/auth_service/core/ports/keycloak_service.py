"""Porta para operações administrativas de Keycloak."""

from abc import ABC, abstractmethod
from typing import Any, Optional


class IKeycloakService(ABC):
    @abstractmethod
    async def check_username_exists(
        self, username: str, exclude_keycloak_id: Optional[str] = None
    ) -> bool:
        ...

    @abstractmethod
    async def update_user(self, keycloak_id: str, data: dict[str, Any]) -> None:
        ...

    @abstractmethod
    async def get_users_by_email(self, email: str) -> list[dict[str, Any]]:
        ...

    @abstractmethod
    async def get_users_by_username(self, username: str) -> list[dict[str, Any]]:
        ...

    @abstractmethod
    async def create_user(self, user_data: dict[str, Any]) -> str:
        ...

