"""Testes unitários para o auth_client do competitions-service."""

import pytest
import pytest_asyncio
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from src.services.auth_client import (
    AuthClient,
    AuthClientError,
    AuthServiceUnavailable,
    MemberValidationFailed,
    OrganizationNotFound,
    get_auth_client,
)


class TestAuthClient:
    """Testes para o AuthClient."""

    @pytest.mark.asyncio
    async def test_validate_members_all_valid(self):
        """Testa validação bem-sucedida de membros."""
        user_id_1 = uuid4()
        user_id_2 = uuid4()
        
        mock_response = {
            "organization_slug": "test-org",
            "organization_exists": True,
            "all_valid": True,
            "valid_count": 2,
            "invalid_count": 0,
            "results": [
                {"user_id": str(user_id_1), "exists": True, "is_member": True, "username": "user1"},
                {"user_id": str(user_id_2), "exists": True, "is_member": True, "username": "user2"},
            ]
        }
        
        with patch.object(httpx.AsyncClient, 'post') as mock_post:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: mock_response,
                raise_for_status=lambda: None
            )
            
            async with AuthClient(base_url="http://localhost:8000") as client:
                result = await client.validate_organization_members(
                    organization_slug="test-org",
                    keycloak_ids=[user_id_1, user_id_2]
                )
            
            assert result["all_valid"] is True
            assert result["valid_count"] == 2

    @pytest.mark.asyncio
    async def test_validate_members_some_invalid_raises_exception(self):
        """Testa que validação com membros inválidos lança exceção."""
        user_id_1 = uuid4()
        user_id_2 = uuid4()
        
        mock_response = {
            "organization_slug": "test-org",
            "organization_exists": True,
            "all_valid": False,
            "valid_count": 1,
            "invalid_count": 1,
            "results": [
                {"user_id": str(user_id_1), "exists": True, "is_member": True, "username": "user1"},
                {"user_id": str(user_id_2), "exists": True, "is_member": False, "username": "user2", "error": "Não é membro"},
            ]
        }
        
        with patch.object(httpx.AsyncClient, 'post') as mock_post:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: mock_response,
                raise_for_status=lambda: None
            )
            
            async with AuthClient(base_url="http://localhost:8000") as client:
                with pytest.raises(MemberValidationFailed) as exc_info:
                    await client.validate_organization_members(
                        organization_slug="test-org",
                        keycloak_ids=[user_id_1, user_id_2]
                    )
            
            assert len(exc_info.value.invalid_users) == 1
            assert exc_info.value.invalid_users[0]["user_id"] == str(user_id_2)

    @pytest.mark.asyncio
    async def test_validate_members_organization_not_found(self):
        """Testa que organização não encontrada lança exceção."""
        user_id = uuid4()
        
        mock_response = {
            "organization_slug": "nonexistent",
            "organization_exists": False,
            "all_valid": False,
            "valid_count": 0,
            "invalid_count": 1,
            "results": []
        }
        
        with patch.object(httpx.AsyncClient, 'post') as mock_post:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: mock_response,
                raise_for_status=lambda: None
            )
            
            async with AuthClient(base_url="http://localhost:8000") as client:
                with pytest.raises(OrganizationNotFound):
                    await client.validate_organization_members(
                        organization_slug="nonexistent",
                        keycloak_ids=[user_id]
                    )

    @pytest.mark.asyncio
    async def test_validate_members_service_unavailable_connect_error(self):
        """Testa que erro de conexão lança AuthServiceUnavailable."""
        user_id = uuid4()
        
        with patch.object(httpx.AsyncClient, 'post') as mock_post:
            mock_post.side_effect = httpx.ConnectError("Connection refused")
            
            async with AuthClient(base_url="http://localhost:8000") as client:
                with pytest.raises(AuthServiceUnavailable):
                    await client.validate_organization_members(
                        organization_slug="test-org",
                        keycloak_ids=[user_id]
                    )

    @pytest.mark.asyncio
    async def test_validate_members_service_unavailable_timeout(self):
        """Testa que timeout lança AuthServiceUnavailable."""
        user_id = uuid4()
        
        with patch.object(httpx.AsyncClient, 'post') as mock_post:
            mock_post.side_effect = httpx.TimeoutException("Request timed out")
            
            async with AuthClient(base_url="http://localhost:8000") as client:
                with pytest.raises(AuthServiceUnavailable):
                    await client.validate_organization_members(
                        organization_slug="test-org",
                        keycloak_ids=[user_id]
                    )

    @pytest.mark.asyncio
    async def test_check_organization_exists_found(self):
        """Testa verificação de organização existente."""
        org_id = uuid4()
        
        mock_response = {
            "exists": True,
            "organization_id": str(org_id),
            "organization_name": "Test Organization"
        }
        
        with patch.object(httpx.AsyncClient, 'get') as mock_get:
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: mock_response,
                raise_for_status=lambda: None
            )
            
            async with AuthClient(base_url="http://localhost:8000") as client:
                result = await client.check_organization_exists("test-org")
            
            assert result["exists"] is True
            assert result["organization_id"] == str(org_id)

    @pytest.mark.asyncio
    async def test_check_organization_exists_not_found(self):
        """Testa verificação de organização inexistente."""
        mock_response = {
            "exists": False,
            "organization_id": None,
            "organization_name": None
        }
        
        with patch.object(httpx.AsyncClient, 'get') as mock_get:
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: mock_response,
                raise_for_status=lambda: None
            )
            
            async with AuthClient(base_url="http://localhost:8000") as client:
                result = await client.check_organization_exists("nonexistent")
            
            assert result["exists"] is False
            assert result["organization_id"] is None

    @pytest.mark.asyncio
    async def test_client_not_initialized_raises_error(self):
        """Testa que usar cliente sem inicializar lança erro."""
        client = AuthClient(base_url="http://localhost:8000")
        
        with pytest.raises(RuntimeError, match="Cliente não inicializado"):
            await client.validate_organization_members(
                organization_slug="test-org",
                keycloak_ids=[uuid4()]
            )

    def test_get_auth_client_factory(self):
        """Testa factory function."""
        client = get_auth_client("http://localhost:8000", timeout=15)
        
        assert isinstance(client, AuthClient)
        assert client.base_url == "http://localhost:8000"
        assert client.timeout == 15
