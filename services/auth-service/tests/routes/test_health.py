"""Integration tests for health endpoints."""

import pytest


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """Test health check endpoint returns ok status."""
        response = await client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "auth-service"
