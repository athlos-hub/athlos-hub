"""
Testes de Integração para as rotas de usuários (/users).

Testa os principais fluxos:
- GET /users - Listar todos os usuários (admin only)
- GET /users/{user_id} - Obter usuário por ID
"""
import pytest
from httpx import AsyncClient
import uuid

from src.models.user import User


class TestGetUserById:
    """Testes para GET /users/{user_id}"""
    
    @pytest.mark.asyncio
    async def test_get_user_by_id_success(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Deve retornar usuário quando encontrado."""
        response = await client.get(f"/users/{test_user.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["username"] == test_user.username
        assert data["first_name"] == test_user.first_name
        assert data["last_name"] == test_user.last_name
    
    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, client: AsyncClient):
        """Deve retornar 404 quando usuário não existe."""
        fake_uuid = uuid.uuid4()
        response = await client.get(f"/users/{fake_uuid}")
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_get_user_by_id_invalid_uuid(self, client: AsyncClient):
        """Deve retornar 422 com UUID inválido."""
        response = await client.get("/users/invalid-uuid")
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_get_disabled_user_returns_404(
        self,
        client: AsyncClient,
        unverified_user: User
    ):
        """Deve retornar 404 para usuários desabilitados."""
        response = await client.get(f"/users/{unverified_user.id}")
        
        assert response.status_code == 404


class TestGetAllUsers:
    """Testes para GET /users (admin only)"""
    
    @pytest.mark.asyncio
    async def test_get_users_without_auth(self, client: AsyncClient):
        """Deve retornar 403 sem autenticação."""
        response = await client.get("/users")
        
        assert response.status_code == 403
