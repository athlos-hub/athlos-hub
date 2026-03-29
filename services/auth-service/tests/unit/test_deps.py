"""Unit tests for API dependencies."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

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
    """Tests for get_current_user_optional dependency (cabeçalho X-Keycloak-Sub)."""

    @pytest.mark.asyncio
    async def test_no_header_returns_none(self):
        mock_repo = AsyncMock()
        mock_repo.get_by_keycloak_id = AsyncMock()

        result = await get_current_user_optional(mock_repo, None)

        assert result is None
        mock_repo.get_by_keycloak_id.assert_not_called()

    @pytest.mark.asyncio
    async def test_header_returns_user(self, mock_user):
        mock_repo = AsyncMock()
        mock_repo.get_by_keycloak_id = AsyncMock(return_value=mock_user)

        result = await get_current_user_optional(mock_repo, str(mock_user.keycloak_id))

        assert result == mock_user
