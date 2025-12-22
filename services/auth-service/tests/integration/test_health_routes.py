"""
Testes de Integração para as rotas de health check (/health).

Testa o endpoint de verificação de saúde da API.
"""
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient


class TestHealthCheck:
    """Testes para as rotas de health check"""
    
    @pytest.mark.asyncio
    async def test_health_check_healthy(self, client: AsyncClient):
        """Deve retornar status saudável quando todos os serviços estão ok."""
        with patch('src.routes.health_routes.db') as mock_db, \
             patch('src.routes.health_routes.AuthService') as mock_auth:
            
            mock_db.check_health = AsyncMock(return_value=True)
            
            mock_auth.get_public_key = AsyncMock(return_value="mock-public-key")
            
            response = await client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["checks"]["database"] == "ok"
        assert data["checks"]["keycloak"] == "ok"
    
    @pytest.mark.asyncio
    async def test_health_check_unhealthy_database(self, client: AsyncClient):
        """Deve retornar status não saudável quando banco de dados falha."""
        with patch('src.routes.health_routes.db') as mock_db, \
             patch('src.routes.health_routes.AuthService') as mock_auth:
            
            mock_db.check_health = AsyncMock(side_effect=Exception("Connection error"))
            
            mock_auth.get_public_key = AsyncMock(return_value="mock-public-key")
            
            response = await client.get("/health")
        
        assert response.status_code == 503
        data = response.json()
        
        assert data["status"] == "unhealthy"
        assert "error" in data["checks"]["database"]
    
    @pytest.mark.asyncio
    async def test_health_check_unhealthy_keycloak(self, client: AsyncClient):
        """Deve retornar status não saudável quando Keycloak falha."""
        with patch('src.routes.health_routes.db') as mock_db, \
             patch('src.routes.health_routes.AuthService') as mock_auth:
            
            mock_db.check_health = AsyncMock(return_value=True)
            
            mock_auth.get_public_key = AsyncMock(side_effect=Exception("Keycloak unavailable"))
            
            response = await client.get("/health")
        
        assert response.status_code == 503
        data = response.json()
        
        assert data["status"] == "unhealthy"
        assert "error" in data["checks"]["keycloak"]
