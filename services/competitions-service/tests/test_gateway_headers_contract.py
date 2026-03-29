"""Contrato dos cabeçalhos injetados pelo Kong (sem sub → 401; com X-Keycloak-Sub → 200)."""

from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient

from src.core.app import create_app
from src.routes.routes import get_session


@pytest.mark.asyncio
async def test_protected_route_without_sub_returns_401(session):
    mock_auth_client = AsyncMock()
    mock_auth_client.__aenter__.return_value = mock_auth_client
    mock_auth_client.__aexit__.return_value = None
    mock_auth_client.check_user_permission = AsyncMock(return_value=None)

    with patch("src.core.app.db.init", lambda **kwargs: None), patch(
        "src.core.app.db.check_health", new_callable=AsyncMock
    ), patch("src.core.app.db.close", new_callable=AsyncMock), patch(
        "src.api.deps.AuthClient", return_value=mock_auth_client
    ), patch(
        "src.services.modality_service.AuthClient", return_value=mock_auth_client
    ), patch(
        "src.services.teams_service.AuthClient", return_value=mock_auth_client
    ), patch(
        "src.routes.matches_routes.AuthClient", return_value=mock_auth_client
    ), patch(
        "src.routes.competitions_routes.AuthClient", return_value=mock_auth_client
    ), patch(
        "src.routes.team_routes.AuthClient", return_value=mock_auth_client
    ):
        app = create_app()

        async def override_get_session():
            yield session

        app.dependency_overrides[get_session] = override_get_session
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.get("/api/teams/me")
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_with_x_keycloak_sub_returns_200(session):
    mock_auth_client = AsyncMock()
    mock_auth_client.__aenter__.return_value = mock_auth_client
    mock_auth_client.__aexit__.return_value = None
    mock_auth_client.check_user_permission = AsyncMock(return_value=None)

    kid = UUID("00000000-0000-0000-0000-000000000042")

    with patch("src.core.app.db.init", lambda **kwargs: None), patch(
        "src.core.app.db.check_health", new_callable=AsyncMock
    ), patch("src.core.app.db.close", new_callable=AsyncMock), patch(
        "src.api.deps.AuthClient", return_value=mock_auth_client
    ), patch(
        "src.services.modality_service.AuthClient", return_value=mock_auth_client
    ), patch(
        "src.services.teams_service.AuthClient", return_value=mock_auth_client
    ), patch(
        "src.routes.matches_routes.AuthClient", return_value=mock_auth_client
    ), patch(
        "src.routes.competitions_routes.AuthClient", return_value=mock_auth_client
    ), patch(
        "src.routes.team_routes.AuthClient", return_value=mock_auth_client
    ):
        app = create_app()

        async def override_get_session():
            yield session

        app.dependency_overrides[get_session] = override_get_session
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.get(
                "/api/teams/me",
                headers={"X-Keycloak-Sub": str(kid)},
            )
        assert r.status_code == 200
        assert isinstance(r.json(), list)
