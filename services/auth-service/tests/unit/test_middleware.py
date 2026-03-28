"""Unit tests for API middleware."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from starlette.requests import Request
from starlette.responses import JSONResponse

from auth_service.api.middleware import KeycloakAuthMiddleware


class TestKeycloakAuthMiddleware:
    """Tests for KeycloakAuthMiddleware."""

    @pytest.fixture
    def mock_app(self):
        """Create a mock ASGI app."""
        return MagicMock()

    @pytest.fixture
    def middleware(self, mock_app):
        """Create middleware instance."""
        return KeycloakAuthMiddleware(mock_app)

    def test_is_public_path_docs(self, middleware):
        """Test /docs is identified as public path."""
        assert middleware._is_public_path("/docs") is True

    def test_is_public_path_redoc(self, middleware):
        """Test /redoc is identified as public path."""
        assert middleware._is_public_path("/redoc") is True

    def test_is_public_path_openapi(self, middleware):
        """Test /openapi.json is identified as public path."""
        assert middleware._is_public_path("/openapi.json") is True

    def test_is_public_path_health(self, middleware):
        """Test /health is identified as public path."""
        assert middleware._is_public_path("/health") is True

    def test_is_public_path_auth(self, middleware):
        """Test /auth/ is identified as public path."""
        assert middleware._is_public_path("/auth/login") is True
        assert middleware._is_public_path("/auth/register") is True

    def test_is_public_path_users(self, middleware):
        """Test /users/ is identified as public path."""
        assert middleware._is_public_path("/users/") is True
        assert middleware._is_public_path("/users/123") is True

    def test_is_public_path_private(self, middleware):
        """Test private paths are not identified as public."""
        assert middleware._is_public_path("/api/organizations") is False
        assert middleware._is_public_path("/private/endpoint") is False

    @pytest.mark.asyncio
    async def test_dispatch_options_request(self, middleware):
        """Test OPTIONS request passes through without auth."""
        request = MagicMock(spec=Request)
        request.method = "OPTIONS"

        call_next = AsyncMock(return_value=MagicMock())

        result = await middleware.dispatch(request, call_next)

        call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_dispatch_public_path(self, middleware):
        """Test public path passes through without auth."""
        request = MagicMock(spec=Request)
        request.method = "GET"
        request.url.path = "/docs"

        call_next = AsyncMock(return_value=MagicMock())

        result = await middleware.dispatch(request, call_next)

        call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_dispatch_no_auth_header(self, middleware):
        """Test request without auth header passes through."""
        request = MagicMock(spec=Request)
        request.method = "GET"
        request.url.path = "/api/protected"
        request.headers.get.return_value = None

        call_next = AsyncMock(return_value=MagicMock())

        result = await middleware.dispatch(request, call_next)

        call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_dispatch_invalid_auth_header_format(self, middleware):
        """Test request with non-Bearer auth header passes through."""
        request = MagicMock(spec=Request)
        request.method = "GET"
        request.url.path = "/api/protected"
        request.headers.get.return_value = "Basic dXNlcjpwYXNz"

        call_next = AsyncMock(return_value=MagicMock())

        result = await middleware.dispatch(request, call_next)

        call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_dispatch_valid_token(self, middleware):
        """Test request with valid token sets user payload."""
        request = MagicMock(spec=Request)
        request.method = "GET"
        request.url.path = "/api/protected"
        request.headers.get.return_value = "Bearer valid_token"
        request.state = MagicMock()

        call_next = AsyncMock(return_value=MagicMock())

        with patch(
            "auth_service.api.middleware.AuthenticationService.get_public_key",
            new_callable=AsyncMock,
        ) as mock_get_key:
            with patch(
                "auth_service.api.middleware.JwtHandler.decode_token"
            ) as mock_decode:
                mock_get_key.return_value = "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----"
                mock_decode.return_value = {"sub": "user-123", "email": "user@example.com"}

                result = await middleware.dispatch(request, call_next)

                assert request.state.user_payload == {"sub": "user-123", "email": "user@example.com"}
                assert request.state.user_id == "user-123"
                call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_dispatch_expired_token(self, middleware):
        """Test request with expired token returns 401."""
        from auth_service.common.exceptions import TokenExpiredError

        request = MagicMock(spec=Request)
        request.method = "GET"
        request.url.path = "/api/protected"
        request.headers.get.return_value = "Bearer expired_token"

        call_next = AsyncMock()

        with patch(
            "auth_service.api.middleware.AuthenticationService.get_public_key",
            new_callable=AsyncMock,
        ) as mock_get_key:
            with patch(
                "auth_service.api.middleware.JwtHandler.decode_token"
            ) as mock_decode:
                mock_get_key.return_value = "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----"
                mock_decode.side_effect = TokenExpiredError()

                result = await middleware.dispatch(request, call_next)

                assert isinstance(result, JSONResponse)
                assert result.status_code == 401
                call_next.assert_not_called()

    @pytest.mark.asyncio
    async def test_dispatch_invalid_credentials(self, middleware):
        """Test request with invalid credentials returns 401."""
        from auth_service.common.exceptions import InvalidCredentialsError

        request = MagicMock(spec=Request)
        request.method = "GET"
        request.url.path = "/api/protected"
        request.headers.get.return_value = "Bearer invalid_token"

        call_next = AsyncMock()

        with patch(
            "auth_service.api.middleware.AuthenticationService.get_public_key",
            new_callable=AsyncMock,
        ) as mock_get_key:
            with patch(
                "auth_service.api.middleware.JwtHandler.decode_token"
            ) as mock_decode:
                mock_get_key.return_value = "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----"
                mock_decode.side_effect = InvalidCredentialsError("Invalid token")

                result = await middleware.dispatch(request, call_next)

                assert isinstance(result, JSONResponse)
                assert result.status_code == 401

    @pytest.mark.asyncio
    async def test_dispatch_malformed_token(self, middleware):
        """Test request with malformed token returns 401."""
        request = MagicMock(spec=Request)
        request.method = "GET"
        request.url.path = "/api/protected"
        request.headers.get.return_value = "Bearer malformed_token"

        call_next = AsyncMock()

        with patch(
            "auth_service.api.middleware.AuthenticationService.get_public_key",
            new_callable=AsyncMock,
        ) as mock_get_key:
            with patch(
                "auth_service.api.middleware.JwtHandler.decode_token"
            ) as mock_decode:
                mock_get_key.return_value = "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----"
                mock_decode.side_effect = Exception("Malformed token")

                result = await middleware.dispatch(request, call_next)

                assert isinstance(result, JSONResponse)
                assert result.status_code == 401
