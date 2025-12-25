"""Interfaces abstratas para serviços externos"""

from abc import ABC, abstractmethod
from typing import Any, Optional


class IKeycloakService(ABC):
    """Interface abstrata para operações de administração do Keycloak."""

    @abstractmethod
    async def check_username_exists(
        self, username: str, exclude_keycloak_id: Optional[str] = None
    ) -> bool:
        """Verifica se o nome de usuário existe no Keycloak."""
        ...

    @abstractmethod
    async def update_user(self, keycloak_id: str, data: dict[str, Any]) -> None:
        """Atualiza usuário no Keycloak."""
        ...

    @abstractmethod
    async def get_users_by_email(self, email: str) -> list[dict[str, Any]]:
        """Obtém usuários por email do Keycloak."""
        ...

    @abstractmethod
    async def get_users_by_username(self, username: str) -> list[dict[str, Any]]:
        """Obtém usuários por nome de usuário do Keycloak."""
        ...

    @abstractmethod
    async def create_user(self, user_data: dict[str, Any]) -> str:
        """Cria usuário no Keycloak e retorna o ID do usuário."""
        ...
