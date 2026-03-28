"""Testes unitários para os endpoints internos do auth-service."""

import pytest
import pytest_asyncio
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from auth_service.core.app import create_app
from auth_service.schemas.internal import (
    ValidateMembersRequest,
    ValidateMembersResponse,
    UserValidationResult,
)


@pytest.fixture
def mock_org_service():
    """Mock do OrganizationService."""
    return AsyncMock()


@pytest.fixture
def app_with_mocked_service(mock_org_service):
    """Cria app com serviço mockado."""
    app = create_app()
    
    # Override da dependência do OrganizationService
    async def get_mock_org_service():
        return mock_org_service
    
    from auth_service.api.deps import get_organization_service
    app.dependency_overrides[get_organization_service] = get_mock_org_service
    
    return app


@pytest_asyncio.fixture
async def client(app_with_mocked_service):
    """Cliente HTTP para testes."""
    async with AsyncClient(
        transport=ASGITransport(app=app_with_mocked_service),
        base_url="http://test"
    ) as client:
        yield client


class TestValidateMembersEndpoint:
    """Testes para o endpoint POST /api/internal/validate-members"""

    @pytest.mark.asyncio
    async def test_validate_members_all_valid(self, client, mock_org_service):
        """Testa validação quando todos os membros são válidos."""
        user_id_1 = uuid4()
        user_id_2 = uuid4()
        
        mock_org_service.validate_members_for_organization.return_value = ValidateMembersResponse(
            organization_slug="test-org",
            organization_exists=True,
            all_valid=True,
            valid_count=2,
            invalid_count=0,
            results=[
                UserValidationResult(
                    keycloak_id=user_id_1,
                    exists=True,
                    is_member=True,
                    username="user1"
                ),
                UserValidationResult(
                    keycloak_id=user_id_2,
                    exists=True,
                    is_member=True,
                    username="user2"
                ),
            ]
        )
        
        response = await client.post(
            "/api/internal/validate-members",
            json={
                "organization_slug": "test-org",
                "keycloak_ids": [str(user_id_1), str(user_id_2)]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["organization_exists"] is True
        assert data["all_valid"] is True
        assert data["valid_count"] == 2
        assert data["invalid_count"] == 0

    @pytest.mark.asyncio
    async def test_validate_members_some_invalid(self, client, mock_org_service):
        """Testa validação quando alguns membros são inválidos."""
        user_id_1 = uuid4()
        user_id_2 = uuid4()
        
        mock_org_service.validate_members_for_organization.return_value = ValidateMembersResponse(
            organization_slug="test-org",
            organization_exists=True,
            all_valid=False,
            valid_count=1,
            invalid_count=1,
            results=[
                UserValidationResult(
                    keycloak_id=user_id_1,
                    exists=True,
                    is_member=True,
                    username="user1"
                ),
                UserValidationResult(
                    keycloak_id=user_id_2,
                    exists=True,
                    is_member=False,
                    username="user2",
                    error="Usuário não é membro ativo da organização"
                ),
            ]
        )
        
        response = await client.post(
            "/api/internal/validate-members",
            json={
                "organization_slug": "test-org",
                "keycloak_ids": [str(user_id_1), str(user_id_2)]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["organization_exists"] is True
        assert data["all_valid"] is False
        assert data["valid_count"] == 1
        assert data["invalid_count"] == 1

    @pytest.mark.asyncio
    async def test_validate_members_organization_not_found(self, client, mock_org_service):
        """Testa validação quando a organização não existe."""
        user_id = uuid4()
        
        mock_org_service.validate_members_for_organization.return_value = ValidateMembersResponse(
            organization_slug="nonexistent-org",
            organization_exists=False,
            all_valid=False,
            valid_count=0,
            invalid_count=1,
            results=[
                UserValidationResult(
                    keycloak_id=user_id,
                    exists=False,
                    is_member=False,
                    error="Organização não encontrada"
                ),
            ]
        )
        
        response = await client.post(
            "/api/internal/validate-members",
            json={
                "organization_slug": "nonexistent-org",
                "keycloak_ids": [str(user_id)]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["organization_exists"] is False
        assert data["all_valid"] is False

    @pytest.mark.asyncio
    async def test_validate_members_user_not_found(self, client, mock_org_service):
        """Testa validação quando um usuário não existe."""
        user_id = uuid4()
        
        mock_org_service.validate_members_for_organization.return_value = ValidateMembersResponse(
            organization_slug="test-org",
            organization_exists=True,
            all_valid=False,
            valid_count=0,
            invalid_count=1,
            results=[
                UserValidationResult(
                    keycloak_id=user_id,
                    exists=False,
                    is_member=False,
                    error="Usuário não encontrado"
                ),
            ]
        )
        
        response = await client.post(
            "/api/internal/validate-members",
            json={
                "organization_slug": "test-org",
                "keycloak_ids": [str(user_id)]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["all_valid"] is False
        assert data["results"][0]["exists"] is False


class TestCheckOrganizationExistsEndpoint:
    """Testes para o endpoint GET /api/internal/organizations/{org_slug}/exists"""

    @pytest.mark.asyncio
    async def test_organization_exists(self, client, mock_org_service):
        """Testa quando a organização existe."""
        org_id = uuid4()
        mock_org = MagicMock()
        mock_org.id = org_id
        mock_org.name = "Test Organization"
        
        mock_org_service.get_organization_by_slug_internal.return_value = mock_org
        
        response = await client.get("/api/internal/organizations/test-org/exists")
        
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is True
        assert data["organization_id"] == str(org_id)
        assert data["organization_name"] == "Test Organization"

    @pytest.mark.asyncio
    async def test_organization_not_exists(self, client, mock_org_service):
        """Testa quando a organização não existe."""
        mock_org_service.get_organization_by_slug_internal.return_value = None
        
        response = await client.get("/api/internal/organizations/nonexistent/exists")
        
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is False
        assert data["organization_id"] is None
        assert data["organization_name"] is None
