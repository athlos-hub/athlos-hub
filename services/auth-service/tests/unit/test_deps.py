"""Unit tests for API dependencies."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from starlette.requests import Request

from auth_service.api.deps import (
    get_user_repository,
    get_organization_repository,
    get_organization_member_repository,
    get_organization_organizer_repository,
    get_keycloak_service,
    get_user_service,
    get_organization_service,
    get_authentication_service,
    get_current_user_optional,
    OrgRole,
)


class TestOrgRoleConstants:
    """Tests for OrgRole constants."""

    def test_owner_constant(self):
        """Test OWNER constant value."""
        assert OrgRole.OWNER == "OWNER"

    def test_organizer_constant(self):
        """Test ORGANIZER constant value."""
        assert OrgRole.ORGANIZER == "ORGANIZER"

    def test_member_constant(self):
        """Test MEMBER constant value."""
        assert OrgRole.MEMBER == "MEMBER"

    def test_none_constant(self):
        """Test NONE constant value."""
        assert OrgRole.NONE == "NONE"


class TestRepositoryFactories:
    """Tests for repository factory functions."""

    def test_get_user_repository(self):
        """Test get_user_repository returns UserRepository."""
        mock_session = MagicMock()

        result = get_user_repository(mock_session)

        assert result is not None
        assert result._session == mock_session

    def test_get_organization_repository(self):
        """Test get_organization_repository returns OrganizationRepository."""
        mock_session = MagicMock()

        result = get_organization_repository(mock_session)

        assert result is not None
        assert result._session == mock_session

    def test_get_organization_member_repository(self):
        """Test get_organization_member_repository returns OrganizationMemberRepository."""
        mock_session = MagicMock()

        result = get_organization_member_repository(mock_session)

        assert result is not None
        assert result._session == mock_session

    def test_get_organization_organizer_repository(self):
        """Test get_organization_organizer_repository returns OrganizationOrganizerRepository."""
        mock_session = MagicMock()

        result = get_organization_organizer_repository(mock_session)

        assert result is not None
        assert result._session == mock_session


class TestServiceFactories:
    """Tests for service factory functions."""

    def test_get_keycloak_service(self):
        """Test get_keycloak_service returns KeycloakAdminService."""
        result = get_keycloak_service()

        assert result is not None

    def test_get_user_service(self):
        """Test get_user_service returns UserService."""
        mock_user_repo = MagicMock()
        mock_keycloak_service = MagicMock()

        result = get_user_service(mock_user_repo, mock_keycloak_service)

        assert result is not None
        assert result._user_repo == mock_user_repo
        assert result._keycloak_service == mock_keycloak_service

    def test_get_organization_service(self):
        """Test get_organization_service returns OrganizationService."""
        mock_org_repo = MagicMock()
        mock_member_repo = MagicMock()
        mock_organizer_repo = MagicMock()
        mock_user_repo = MagicMock()

        result = get_organization_service(
            mock_org_repo, mock_member_repo, mock_organizer_repo, mock_user_repo
        )

        assert result is not None
        assert result._org_repo == mock_org_repo
        assert result._member_repo == mock_member_repo

    def test_get_authentication_service(self):
        """Test get_authentication_service returns AuthenticationService."""
        mock_user_repo = MagicMock()

        result = get_authentication_service(mock_user_repo)

        assert result is not None
        assert result._user_repo == mock_user_repo


class TestGetCurrentUserOptional:
    """Tests for get_current_user_optional dependency."""

    @pytest.mark.asyncio
    async def test_no_auth_header_returns_none(self):
        """Test returns None when no Authorization header."""
        request = MagicMock(spec=Request)
        request.headers.get.return_value = None

        mock_auth_service = MagicMock()

        result = await get_current_user_optional(request, mock_auth_service)

        assert result is None

    @pytest.mark.asyncio
    async def test_invalid_auth_header_format_returns_none(self):
        """Test returns None when Authorization header doesn't start with Bearer."""
        request = MagicMock(spec=Request)
        request.headers.get.return_value = "Basic dXNlcjpwYXNz"

        mock_auth_service = MagicMock()

        result = await get_current_user_optional(request, mock_auth_service)

        assert result is None

    @pytest.mark.asyncio
    async def test_valid_token_returns_user(self, mock_user):
        """Test returns user when valid token is provided."""
        request = MagicMock(spec=Request)
        request.headers.get.return_value = "Bearer valid_token"

        mock_auth_service = AsyncMock()
        mock_auth_service.get_or_create_user_from_keycloak_token = AsyncMock(
            return_value=mock_user
        )

        with patch(
            "auth_service.api.deps.AuthenticationService.get_public_key",
            new_callable=AsyncMock,
        ) as mock_get_key:
            with patch("auth_service.api.deps.JwtHandler.decode_token") as mock_decode:
                mock_get_key.return_value = "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----"
                mock_decode.return_value = {"sub": "keycloak-user-123"}

                result = await get_current_user_optional(request, mock_auth_service)

                assert result == mock_user

    @pytest.mark.asyncio
    async def test_exception_returns_none(self):
        """Test returns None when exception occurs during token processing."""
        request = MagicMock(spec=Request)
        request.headers.get.return_value = "Bearer invalid_token"

        mock_auth_service = MagicMock()

        with patch(
            "auth_service.api.deps.AuthenticationService.get_public_key",
            new_callable=AsyncMock,
        ) as mock_get_key:
            mock_get_key.side_effect = Exception("Token error")

            result = await get_current_user_optional(request, mock_auth_service)

            assert result is None

    @pytest.mark.asyncio
    async def test_token_decode_error_returns_none(self):
        """Test returns None when token decode fails."""
        request = MagicMock(spec=Request)
        request.headers.get.return_value = "Bearer malformed_token"

        mock_auth_service = MagicMock()

        with patch(
            "auth_service.api.deps.AuthenticationService.get_public_key",
            new_callable=AsyncMock,
        ) as mock_get_key:
            with patch("auth_service.api.deps.JwtHandler.decode_token") as mock_decode:
                mock_get_key.return_value = "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----"
                mock_decode.side_effect = Exception("Invalid token")

                result = await get_current_user_optional(request, mock_auth_service)

                assert result is None
