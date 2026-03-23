"""Unit tests for UserService."""

import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from auth_service.core.exceptions import UserNotFoundError
from auth_service.services.user_service import UserService
from auth_service.infrastructure.database.models.user_model import User


class TestUserServiceGetUserById:
    """Tests for UserService.get_user_by_id method."""

    @pytest.mark.asyncio
    async def test_get_user_by_id_success(self, mock_user_repository, mock_user):
        """Test successful retrieval of user by ID."""
        mock_user_repository.get_by_id.return_value = mock_user
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_user_by_id(mock_user.id)

        assert result == mock_user
        assert result.email == "user@example.com"
        mock_user_repository.get_by_id.assert_called_once_with(mock_user.id)

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, mock_user_repository):
        """Test UserNotFoundError when user ID doesn't exist."""
        user_id = uuid4()
        mock_user_repository.get_by_id.return_value = None
        service = UserService(user_repository=mock_user_repository)

        with pytest.raises(UserNotFoundError):
            await service.get_user_by_id(user_id)

    @pytest.mark.asyncio
    async def test_get_user_by_id_disabled_user(self, mock_user_repository, mock_user):
        """Test UserNotFoundError when user is disabled."""
        mock_user.enabled = False
        mock_user_repository.get_by_id.return_value = mock_user
        service = UserService(user_repository=mock_user_repository)

        with pytest.raises(UserNotFoundError):
            await service.get_user_by_id(mock_user.id)


class TestUserServiceGetUserByEmail:
    """Tests for UserService.get_user_by_email method."""

    @pytest.mark.asyncio
    async def test_get_user_by_email_success(self, mock_user_repository, mock_user):
        """Test successful retrieval of user by email."""
        mock_user_repository.get_by_email.return_value = mock_user
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_user_by_email(mock_user.email)

        assert result == mock_user
        assert result.email == "user@example.com"
        mock_user_repository.get_by_email.assert_called_once_with(mock_user.email)

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_found(self, mock_user_repository):
        """Test None returned when email doesn't exist."""
        mock_user_repository.get_by_email.return_value = None
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_user_by_email("nonexistent@example.com")

        assert result is None


class TestUserServiceGetUserByKeycloakId:
    """Tests for UserService.get_user_by_keycloak_id method."""

    @pytest.mark.asyncio
    async def test_get_user_by_keycloak_id_success(self, mock_user_repository, mock_user):
        """Test successful retrieval of user by Keycloak ID."""
        mock_user_repository.get_by_keycloak_id.return_value = mock_user
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_user_by_keycloak_id(mock_user.keycloak_id)

        assert result == mock_user
        mock_user_repository.get_by_keycloak_id.assert_called_once_with(
            mock_user.keycloak_id
        )

    @pytest.mark.asyncio
    async def test_get_user_by_keycloak_id_not_found(self, mock_user_repository):
        """Test None returned when Keycloak ID doesn't exist."""
        mock_user_repository.get_by_keycloak_id.return_value = None
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_user_by_keycloak_id("nonexistent-keycloak-id")

        assert result is None


class TestUserServiceGetAllUsers:
    """Tests for UserService get all methods."""

    @pytest.mark.asyncio
    async def test_get_all_enabled_users(self, mock_user_repository, mock_user):
        """Test retrieval of all enabled users."""
        mock_user_repository.get_all_enabled.return_value = [mock_user]
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_all_enabled_users()

        assert len(result) == 1
        assert result[0].email == "user@example.com"
        mock_user_repository.get_all_enabled.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_all_enabled_users_empty(self, mock_user_repository):
        """Test retrieval of all enabled users when none exist."""
        mock_user_repository.get_all_enabled.return_value = []
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_all_enabled_users()

        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_get_all_users(self, mock_user_repository, mock_user):
        """Test admin retrieval of all users."""
        mock_user_repository.get_all.return_value = [mock_user]
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_all_users()

        assert len(result) == 1
        mock_user_repository.get_all.assert_called_once()


class TestUserServiceCreateUser:
    """Tests for UserService.create_user method."""

    @pytest.mark.asyncio
    async def test_create_user_success(self, mock_user_repository, mock_user):
        """Test successful user creation."""
        mock_user_repository.create.return_value = mock_user
        mock_user_repository.commit = AsyncMock()
        service = UserService(user_repository=mock_user_repository)

        result = await service.create_user(mock_user)

        assert result == mock_user
        mock_user_repository.create.assert_called_once_with(mock_user)
        mock_user_repository.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_user_with_commit(self, mock_user_repository, mock_user):
        """Test create_user calls commit on repository."""
        mock_user_repository.create.return_value = mock_user
        mock_user_repository.commit = AsyncMock()
        service = UserService(user_repository=mock_user_repository)

        await service.create_user(mock_user)

        mock_user_repository.commit.assert_called_once()


class TestUserServiceUpdateUser:
    """Tests for UserService.update_user method."""

    @pytest.mark.asyncio
    async def test_update_user_success(self, mock_user_repository, mock_user):
        """Test successful user update."""
        updated_data = {"first_name": "UpdatedName"}
        mock_user.first_name = "UpdatedName"
        mock_user_repository.update.return_value = mock_user
        mock_user_repository.commit = AsyncMock()
        service = UserService(user_repository=mock_user_repository)

        result = await service.update_user(mock_user.id, updated_data)

        assert result.first_name == "UpdatedName"
        mock_user_repository.update.assert_called_once_with(mock_user.id, updated_data)
        mock_user_repository.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_user_not_found(self, mock_user_repository):
        """Test UserNotFoundError when updating non-existent user."""
        user_id = uuid4()
        mock_user_repository.update.return_value = None
        service = UserService(user_repository=mock_user_repository)

        with pytest.raises(UserNotFoundError):
            await service.update_user(user_id, {"first_name": "New"})

    @pytest.mark.asyncio
    async def test_update_user_with_username_check(self, mock_user_repository, mock_user):
        """Test update_user with username check."""
        updated_data = {"username": "newusername"}
        mock_user.username = "newusername"
        mock_user_repository.update.return_value = mock_user
        mock_user_repository.commit = AsyncMock()
        service = UserService(user_repository=mock_user_repository)

        result = await service.update_user(
            mock_user.id,
            updated_data,
            check_username="newusername",
            existing_username_keycloak_id=str(mock_user.id),
        )

        assert result.username == "newusername"


class TestUserServiceIsUserActive:
    """Tests for UserService.is_user_active method."""

    @pytest.mark.asyncio
    async def test_is_user_active_true(self, mock_user_repository, mock_user):
        """Test is_user_active returns True for enabled user."""
        mock_user_repository.get_by_id.return_value = mock_user
        service = UserService(user_repository=mock_user_repository)

        result = await service.is_user_active(mock_user.id)

        assert result is True

    @pytest.mark.asyncio
    async def test_is_user_active_false_disabled(self, mock_user_repository, mock_user):
        """Test is_user_active returns False for disabled user."""
        mock_user.enabled = False
        mock_user_repository.get_by_id.return_value = mock_user
        service = UserService(user_repository=mock_user_repository)

        result = await service.is_user_active(mock_user.id)

        assert result is False

    @pytest.mark.asyncio
    async def test_is_user_active_false_not_found(self, mock_user_repository):
        """Test is_user_active returns False when user doesn't exist."""
        mock_user_repository.get_by_id.return_value = None
        service = UserService(user_repository=mock_user_repository)

        result = await service.is_user_active(uuid4())

        assert result is False


class TestUserServiceGetUserByIdOptional:
    """Tests for UserService.get_user_by_id_optional method."""

    @pytest.mark.asyncio
    async def test_get_user_by_id_optional_success(self, mock_user_repository, mock_user):
        """Test get_user_by_id_optional returns user when exists."""
        mock_user_repository.get_by_id.return_value = mock_user
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_user_by_id_optional(mock_user.id)

        assert result == mock_user

    @pytest.mark.asyncio
    async def test_get_user_by_id_optional_not_found(self, mock_user_repository):
        """Test get_user_by_id_optional returns None when user doesn't exist."""
        mock_user_repository.get_by_id.return_value = None
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_user_by_id_optional(uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_get_user_by_id_optional_disabled_user(
        self, mock_user_repository, mock_user
    ):
        """Test get_user_by_id_optional returns disabled user (no filter)."""
        mock_user.enabled = False
        mock_user_repository.get_by_id.return_value = mock_user
        service = UserService(user_repository=mock_user_repository)

        result = await service.get_user_by_id_optional(mock_user.id)

        assert result == mock_user
        assert result.enabled is False
