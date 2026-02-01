"""Testes de integração para os endpoints de health check."""

import pytest
from httpx import AsyncClient


class TestHealthEndpoints:
    """Testes para endpoints de health check."""

    @pytest.mark.asyncio
    async def test_health_check(self, test_client: AsyncClient):
        """Testa o endpoint de health check."""
        # Act
        response = await test_client.get("/api/v1/health")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "notifications-service"

    @pytest.mark.asyncio
    async def test_readiness_check(self, test_client: AsyncClient):
        """Testa o endpoint de readiness check."""
        # Act
        response = await test_client.get("/api/v1/health/ready")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["service"] == "notifications-service"
