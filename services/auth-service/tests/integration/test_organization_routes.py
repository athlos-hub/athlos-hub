"""
Testes de Integração para as rotas de organizações (/organizations).

Testa os principais fluxos:
- POST /organizations - Criar organização
- GET /organizations - Listar organizações públicas
- GET /organizations/me - Listar minhas organizações

Utiliza factories para criação dinâmica de dados de teste.
"""
import pytest
from httpx import AsyncClient

from src.models.user import User
from src.models.organization import Organization
from src.models.enums import OrganizationPrivacy


class TestCreateOrganization:
    """Testes para POST /organizations"""
    
    @pytest.mark.asyncio
    async def test_create_organization_success(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Deve criar organização com sucesso."""
        org_data = {
            "name": "Nova Organização",
            "description": "Uma descrição de teste",
            "privacy": "PUBLIC"
        }
        
        response = await authenticated_client.post("/organizations", json=org_data)
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["name"] == org_data["name"]
        assert data["slug"] == "nova-organizacao"
        assert data["description"] == org_data["description"]
        assert data["owner_id"] == str(test_user.id)
        assert data["privacy"] == "PUBLIC"
    
    @pytest.mark.asyncio
    async def test_create_organization_without_auth(self, client: AsyncClient):
        """Deve retornar 403 sem autenticação."""
        org_data = {
            "name": "Nova Organização",
            "privacy": "PUBLIC"
        }
        
        response = await client.post("/organizations", json=org_data)
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_create_organization_duplicate_name(
        self,
        authenticated_client: AsyncClient,
        test_organization: Organization
    ):
        """Deve retornar erro ao tentar criar organização com nome duplicado."""
        org_data = {
            "name": test_organization.name,
            "privacy": "PUBLIC"
        }
        
        response = await authenticated_client.post("/organizations", json=org_data)
        
        assert response.status_code == 409
        data = response.json()
        error_message = data.get("detail") or data.get("message") or ""
        assert "já existe" in error_message.lower()
    
    @pytest.mark.asyncio
    async def test_create_organization_name_too_short(
        self,
        authenticated_client: AsyncClient
    ):
        """Deve retornar erro quando nome é muito curto."""
        org_data = {
            "name": "AB",
            "privacy": "PUBLIC"
        }
        
        response = await authenticated_client.post("/organizations", json=org_data)
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_create_private_organization(
        self,
        authenticated_client: AsyncClient,
    ):
        """Deve criar organização privada com sucesso."""
        org_data = {
            "name": "Organização Privada",
            "description": "Uma org privada",
            "privacy": "PRIVATE"
        }
        
        response = await authenticated_client.post("/organizations", json=org_data)
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["privacy"] == "PRIVATE"


class TestGetOrganizations:
    """Testes para GET /organizations"""
    
    @pytest.mark.asyncio
    async def test_get_organizations_success(
        self,
        client: AsyncClient,
        test_organization: Organization
    ):
        """Deve retornar lista de organizações."""
        response = await client.get("/organizations")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        org_names = [org["name"] for org in data]
        assert test_organization.name in org_names
    
    @pytest.mark.asyncio
    async def test_get_organizations_filter_by_privacy(
        self,
        client: AsyncClient,
        user_factory,
        organization_factory
    ):
        """Deve filtrar organizações por privacy usando factories."""
        owner = await user_factory()
        
        await organization_factory(owner=owner, name="Org Publica 1", privacy=OrganizationPrivacy.PUBLIC)
        await organization_factory(owner=owner, name="Org Publica 2", privacy=OrganizationPrivacy.PUBLIC)
        await organization_factory(owner=owner, name="Org Privada", privacy=OrganizationPrivacy.PRIVATE)
        
        response = await client.get("/organizations?privacy=PUBLIC")
        
        assert response.status_code == 200
        data = response.json()
        
        for org in data:
            assert org["privacy"] == "PUBLIC"
        
        org_names = [org["name"] for org in data]
        assert "Org Publica 1" in org_names
        assert "Org Publica 2" in org_names
        assert "Org Privada" not in org_names
    
    @pytest.mark.asyncio
    async def test_get_organizations_pagination(
        self,
        client: AsyncClient,
        user_factory,
        organization_factory
    ):
        """Deve respeitar limit e offset."""
        owner = await user_factory()
        for i in range(5):
            await organization_factory(owner=owner, name=f"Org Paginacao {i}")
        
        response = await client.get("/organizations?limit=2")
        assert response.status_code == 200
        assert len(response.json()) == 2
        
        response_all = await client.get("/organizations?limit=100")
        response_offset = await client.get("/organizations?limit=100&offset=2")
        
        assert len(response_offset.json()) == len(response_all.json()) - 2
    
    @pytest.mark.asyncio
    async def test_get_organizations_empty_list(self, client: AsyncClient):
        """Deve retornar lista vazia quando não há organizações."""
        response = await client.get("/organizations?offset=9999")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 0


class TestGetMyOrganizations:
    """Testes para GET /organizations/me"""
    
    @pytest.mark.asyncio
    async def test_get_my_organizations_success(
        self,
        authenticated_client: AsyncClient,
        test_organization: Organization
    ):
        """Deve retornar organizações do usuário autenticado."""
        response = await authenticated_client.get("/organizations/me")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        found_org = next((org for org in data if org["name"] == test_organization.name), None)
        assert found_org is not None
        assert found_org["role"] == "OWNER"
    
    @pytest.mark.asyncio
    async def test_get_my_organizations_without_auth(self, client: AsyncClient):
        """Deve retornar 403 sem autenticação."""
        response = await client.get("/organizations/me")
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_get_my_organizations_multiple_orgs(
        self,
        make_authenticated_client,
        user_factory,
        organization_factory
    ):
        """Testa usuário com múltiplas organizações usando factories."""
        owner = await user_factory(email="multiowner@test.com", username="multiowner")
        
        org1 = await organization_factory(owner=owner, name="Minha Org 1")
        org2 = await organization_factory(owner=owner, name="Minha Org 2")
        org3 = await organization_factory(owner=owner, name="Minha Org 3")
        
        async with make_authenticated_client(owner) as client:
            response = await client.get("/organizations/me")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 3
        org_names = [org["name"] for org in data]
        assert org1.name in org_names
        assert org2.name in org_names
        assert org3.name in org_names
        
        for org in data:
            assert org["role"] == "OWNER"
    
    @pytest.mark.asyncio
    async def test_get_my_organizations_filter_by_role(
        self,
        authenticated_client: AsyncClient,
        test_organization: Organization
    ):
        """Deve filtrar por role específico."""
        response = await authenticated_client.get("/organizations/me?roles=OWNER")
        
        assert response.status_code == 200
        data = response.json()
        
        for org in data:
            assert org["role"] == "OWNER"
    
    @pytest.mark.asyncio
    async def test_get_my_organizations_invalid_role_filter(
        self,
        authenticated_client: AsyncClient
    ):
        """Deve retornar lista vazia quando filtrado por role que usuário não tem."""
        response = await authenticated_client.get("/organizations/me?roles=ORGANIZER")
        
        assert response.status_code == 200
        data = response.json()
        
        organizer_orgs = [org for org in data if org["role"] == "ORGANIZER"]
        assert len(organizer_orgs) == 0
