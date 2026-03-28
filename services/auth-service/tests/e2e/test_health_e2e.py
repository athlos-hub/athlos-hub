"""
Testes E2E para endpoints de health check.

Estes testes validam:
- Health check básico
- Tempo de resposta aceitável
"""

import pytest
from httpx import AsyncClient


class TestHealthEndpointsE2E:
    """Testes E2E para endpoints de health."""

    @pytest.mark.asyncio
    async def test_health_check(self, test_client: AsyncClient):
        """
        E2E: Testa endpoint de health check básico.
        """
        # Act
        response = await test_client.get("/api/health")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "auth-service"

    @pytest.mark.asyncio
    async def test_health_response_time(self, test_client: AsyncClient):
        """
        E2E: Testa que health check responde em tempo aceitável.
        """
        import time
        
        # Act
        start = time.time()
        response = await test_client.get("/api/health")
        elapsed = time.time() - start
        
        # Assert
        assert response.status_code == 200
        assert elapsed < 0.5  # Deve responder em menos de 500ms
