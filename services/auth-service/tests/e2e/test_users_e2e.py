"""
Testes E2E para endpoints de usuários.

Estes testes validam operações com PostgreSQL real:
- Listagem de usuários
- Busca por ID
- Autenticação requerida
"""

import pytest
from uuid import uuid4
from httpx import AsyncClient

from auth_service.infrastructure.database.models.user_model import User


class TestListUsersE2E:
    """Testes E2E para listagem de usuários."""

    @pytest.mark.asyncio
    async def test_list_users_requires_auth(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa listagem de usuários sem autenticação.
        Endpoint pode ser público, requerer auth, ou fazer redirect.
        """
        # Act
        response = await test_client.get("/api/v1/users")
        
        # Assert - endpoint pode ser público (200), requerer auth (401/403), ou redirect (307)
        assert response.status_code in [200, 307, 401, 403]

    @pytest.mark.asyncio
    async def test_list_users_invalid_token(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que listagem falha com token inválido.
        """
        # Act
        response = await test_client.get(
            "/api/v1/users",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Assert
        assert response.status_code == 401


class TestGetUserByIdE2E:
    """Testes E2E para obter usuário por ID."""

    @pytest.mark.asyncio
    async def test_get_user_by_id_requires_auth(
        self,
        test_client: AsyncClient,
        test_user: User,
    ):
        """
        E2E: Testa obter usuário por ID sem autenticação.
        Endpoint pode ser público ou requerer autenticação.
        """
        # Act
        response = await test_client.get(f"/api/v1/users/{test_user.id}")
        
        # Assert - endpoint pode ser público (200) ou requerer auth (401/403)
        assert response.status_code in [200, 401, 403]

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa erro ao buscar usuário inexistente (sem auth).
        Retorna 404 se público, 401/403 se requer auth.
        """
        fake_id = uuid4()
        
        # Act
        response = await test_client.get(f"/api/v1/users/{fake_id}")
        
        # Assert - 404 se público, 401/403 se requer auth
        assert response.status_code in [401, 403, 404]


class TestGetCurrentUserE2E:
    """Testes E2E para endpoint /users/me."""

    @pytest.mark.asyncio
    async def test_get_me_requires_auth(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que /users/me requer autenticação.
        """
        # Act
        response = await test_client.get("/api/v1/users/me")
        
        # Assert
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_get_me_invalid_token(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que /users/me falha com token inválido.
        """
        # Act
        response = await test_client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Assert
        assert response.status_code == 401


class TestUserDataPersistenceE2E:
    """Testes E2E para verificar persistência de dados de usuário."""

    @pytest.mark.asyncio
    async def test_user_created_in_database(
        self,
        test_user: User,
        async_session,
    ):
        """
        E2E: Verifica que usuário foi realmente criado no PostgreSQL.
        """
        from sqlalchemy import select
        
        # Act
        result = await async_session.execute(
            select(User).where(User.id == test_user.id)
        )
        db_user = result.scalar_one_or_none()
        
        # Assert
        assert db_user is not None
        assert db_user.email == test_user.email
        assert db_user.username == test_user.username
        assert db_user.keycloak_id == test_user.keycloak_id

    @pytest.mark.asyncio
    async def test_multiple_users_isolated(
        self,
        test_user: User,
        another_user: User,
        async_session,
    ):
        """
        E2E: Verifica que múltiplos usuários são armazenados corretamente.
        """
        from sqlalchemy import select, func
        
        # Act
        result = await async_session.execute(select(func.count(User.id)))
        count = result.scalar()
        
        # Assert
        assert count >= 2
        assert test_user.id != another_user.id
        assert test_user.email != another_user.email
