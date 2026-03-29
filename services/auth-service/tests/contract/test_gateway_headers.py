"""Contrato dos cabeçalhos injetados pelo Kong (simulados no TestClient; Kong não sobe)."""

import pytest


@pytest.mark.asyncio
async def test_protected_route_without_gateway_sub_returns_401(client, test_user):
    r = await client.get("/api/users/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_with_x_keycloak_sub_returns_200(client, test_user):
    r = await client.get(
        "/api/users/me",
        headers={"X-Keycloak-Sub": str(test_user.keycloak_id)},
    )
    assert r.status_code == 200
    body = r.json()
    assert body.get("keycloak_id") == str(test_user.keycloak_id)


@pytest.mark.asyncio
async def test_x_test_sub_when_trust_gateway_false(client, test_user, monkeypatch):
    from auth_service.core import config as config_module

    monkeypatch.setattr(config_module.settings, "TRUST_GATEWAY", False)
    r = await client.get(
        "/api/users/me",
        headers={"X-Test-Sub": str(test_user.keycloak_id)},
    )
    assert r.status_code == 200
