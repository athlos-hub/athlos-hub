"""
Testes E2E para endpoints de organizações.

Estes testes validam operações com PostgreSQL real:
- Listagem de organizações
- Filtros por privacidade
- Paginação
- Obter organização por slug
"""

import pytest
from uuid import uuid4
from httpx import AsyncClient

from auth_service.infrastructure.database.models.organization_model import Organization
from auth_service.infrastructure.database.models.user_model import User


class TestListOrganizationsE2E:
    """Testes E2E para listagem de organizações."""

    @pytest.mark.asyncio
    async def test_list_organizations_empty(self, test_client: AsyncClient):
        """
        E2E: Testa listagem de organizações quando não há nenhuma.
        """
        # Act
        response = await test_client.get("/api/organizations")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    @pytest.mark.asyncio
    async def test_list_organizations_with_data(
        self,
        test_client: AsyncClient,
        test_organization: Organization,
    ):
        """
        E2E: Testa listagem de organizações com dados no banco real.
        """
        # Act
        response = await test_client.get("/api/organizations")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verifica que a organização de teste está na lista
        slugs = [org["slug"] for org in data]
        assert test_organization.slug in slugs

    @pytest.mark.asyncio
    async def test_list_organizations_public_only(
        self,
        test_client: AsyncClient,
        test_organization: Organization,
        private_organization: Organization,
    ):
        """
        E2E: Testa filtro de organizações públicas.
        """
        # Act
        response = await test_client.get(
            "/api/organizations",
            params={"privacy": "PUBLIC"}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Todas devem ser públicas
        for org in data:
            assert org["privacy"] == "PUBLIC"
        
        # Organização pública deve estar presente
        slugs = [org["slug"] for org in data]
        assert test_organization.slug in slugs
        
        # Organização privada NÃO deve estar presente
        assert private_organization.slug not in slugs

    @pytest.mark.asyncio
    async def test_list_organizations_private_only(
        self,
        test_client: AsyncClient,
        test_organization: Organization,
        private_organization: Organization,
    ):
        """
        E2E: Testa filtro de organizações privadas.
        """
        # Act
        response = await test_client.get(
            "/api/organizations",
            params={"privacy": "PRIVATE"}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Todas devem ser privadas
        for org in data:
            assert org["privacy"] == "PRIVATE"
        
        # Organização privada deve estar presente
        slugs = [org["slug"] for org in data]
        assert private_organization.slug in slugs
        
        # Organização pública NÃO deve estar presente
        assert test_organization.slug not in slugs

    @pytest.mark.asyncio
    async def test_list_organizations_with_limit(
        self,
        test_client: AsyncClient,
        multiple_organizations: list[Organization],
    ):
        """
        E2E: Testa paginação com limite.
        """
        # Act
        response = await test_client.get(
            "/api/organizations",
            params={"limit": 2}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_list_organizations_with_offset(
        self,
        test_client: AsyncClient,
        multiple_organizations: list[Organization],
    ):
        """
        E2E: Testa paginação com offset.
        """
        # Primeiro, pega todas
        response_all = await test_client.get("/api/organizations")
        all_orgs = response_all.json()
        
        # Act - pega com offset
        response = await test_client.get(
            "/api/organizations",
            params={"limit": 2, "offset": 2}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Não deve incluir os 2 primeiros
        if len(all_orgs) > 2:
            first_two_slugs = [org["slug"] for org in all_orgs[:2]]
            returned_slugs = [org["slug"] for org in data]
            for slug in first_two_slugs:
                assert slug not in returned_slugs


class TestGetOrganizationBySlugE2E:
    """Testes E2E para obter organização por slug."""

    @pytest.mark.asyncio
    async def test_get_organization_by_slug_success(
        self,
        test_client: AsyncClient,
        test_organization: Organization,
    ):
        """
        E2E: Testa obter organização existente por slug.
        """
        # Act
        response = await test_client.get(
            f"/api/organizations/{test_organization.slug}"
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == test_organization.slug
        assert data["name"] == test_organization.name
        assert data["description"] == test_organization.description
        assert data["privacy"] == test_organization.privacy.value

    @pytest.mark.asyncio
    async def test_get_organization_by_slug_not_found(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa erro ao buscar organização inexistente.
        """
        # Act
        response = await test_client.get(
            "/api/organizations/non-existent-organization"
        )
        
        # Assert
        assert response.status_code == 404


class TestOrganizationAuthenticationE2E:
    """Testes E2E para operações que requerem autenticação."""

    @pytest.mark.asyncio
    async def test_create_organization_without_auth(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que criar organização requer autenticação.
        """
        # Act
        response = await test_client.post(
            "/api/organizations",
            data={
                "name": "New Organization",
                "description": "A test organization",
                "privacy": "PUBLIC",
            }
        )
        
        # Assert - deve falhar sem autenticação
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_create_organization_invalid_token(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que criar organização falha com token inválido.
        """
        # Act
        response = await test_client.post(
            "/api/organizations",
            headers={"Authorization": "Bearer invalid-token-here"},
            data={
                "name": "New Organization",
                "description": "A test organization",
                "privacy": "PUBLIC",
            }
        )
        
        # Assert
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_my_organizations_without_auth(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que /organizations/me requer autenticação.
        """
        # Act
        response = await test_client.get("/api/organizations/me")
        
        # Assert
        assert response.status_code in [401, 403]


class TestOrganizationDataIntegrityE2E:
    """Testes E2E para integridade de dados."""

    @pytest.mark.asyncio
    async def test_organization_has_owner(
        self,
        test_client: AsyncClient,
        test_organization: Organization,
        test_user: User,
    ):
        """
        E2E: Verifica que organização tem owner_id correto.
        """
        # Act
        response = await test_client.get(
            f"/api/organizations/{test_organization.slug}"
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["owner_id"] == str(test_user.id)

    @pytest.mark.asyncio
    async def test_organization_slug_is_unique(
        self,
        test_client: AsyncClient,
        test_organization: Organization,
    ):
        """
        E2E: Verifica que slug retornado corresponde ao esperado.
        """
        # Act
        response = await test_client.get("/api/organizations")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        
        # Conta quantas organizações têm o mesmo slug
        matching_slugs = [org for org in data if org["slug"] == test_organization.slug]
        assert len(matching_slugs) == 1
