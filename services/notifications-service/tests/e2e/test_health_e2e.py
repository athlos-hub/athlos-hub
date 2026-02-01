"""Testes E2E para os endpoints de health check com banco de dados real."""

import pytest
from httpx import AsyncClient


class TestHealthEndpointsE2E:
    """Testes E2E para endpoints de health check."""

    @pytest.mark.asyncio
    async def test_health_check(self, test_client: AsyncClient):
        """
        E2E: Testa o endpoint de health check.
        
        Verifica se o serviço está rodando corretamente com
        conexão real ao banco de dados.
        """
        # Act
        response = await test_client.get("/api/v1/health")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "notifications-service"

    @pytest.mark.asyncio
    async def test_readiness_check(self, test_client: AsyncClient):
        """
        E2E: Testa o endpoint de readiness check.
        
        Verifica se o serviço está pronto para receber requisições
        com todas as dependências funcionando.
        """
        # Act
        response = await test_client.get("/api/v1/health/ready")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["service"] == "notifications-service"

    @pytest.mark.asyncio
    async def test_health_response_time(self, test_client: AsyncClient):
        """
        E2E: Testa se o health check responde em tempo aceitável.
        
        O endpoint deve responder em menos de 1 segundo.
        """
        import time
        
        # Act
        start_time = time.time()
        response = await test_client.get("/api/v1/health")
        elapsed_time = time.time() - start_time
        
        # Assert
        assert response.status_code == 200
        assert elapsed_time < 1.0, f"Health check demorou {elapsed_time:.2f}s"
