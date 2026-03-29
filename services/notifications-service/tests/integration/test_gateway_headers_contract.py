"""Contrato dos cabeçalhos do Kong (simulados; auth-service é mockado via httpx)."""

from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest


@pytest.mark.asyncio
async def test_notifications_without_gateway_sub_returns_401(test_client):
    r = await test_client.get("/api/notifications")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_notifications_with_x_keycloak_sub_returns_200(
    test_client, sample_user_id: UUID, multiple_notifications
):
    class _MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url: str, timeout: float = 0):
            m = MagicMock()
            m.status_code = 200
            m.json.return_value = {"id": str(sample_user_id)}
            return m

    with patch(
        "notifications_service.api.deps.httpx.AsyncClient",
        return_value=_MockClient(),
    ):
        r = await test_client.get(
            "/api/notifications",
            headers={"X-Keycloak-Sub": "keycloak-sub-contract"},
        )
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert isinstance(data["items"], list)
