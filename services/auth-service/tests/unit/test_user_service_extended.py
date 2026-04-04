"""Extended unit tests for UserService - profile updates and admin operations."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from auth_service.core.exceptions import (
    KeycloakCommunicationError,
    UserNotFoundError,
    UsernameAlreadyInUseError,
)
from auth_service.services.user_service import UserService
from auth_service.infrastructure.database.models.user_model import User


class TestUserServiceUpdateUserProfile:
    """Tests for UserService.update_user_profile method."""

    @pytest.mark.asyncio
    async def test_update_user_profile_first_name(
        self, mock_user_repository, mock_user, mock_keycloak_service
    ):
        """Test updating user profile first name."""
        mock_user_repository.get_by_id.return_value = mock_user
        mock_user_repository.update.return_value = mock_user
        mock_user_repository.commit = AsyncMock()
        mock_keycloak_service.update_user = AsyncMock()

        service = UserService(
            user_repository=mock_user_repository,
            keycloak_service=mock_keycloak_service,
        )

        result = await service.update_user_profile(
            user=mock_user,
            first_name="NewFirstName",
        )

        assert result == mock_user
        mock_keycloak_service.get_user.assert_called_once_with(mock_user.keycloak_id)
        mock_keycloak_service.update_user.assert_called_once()
        call_args = mock_keycloak_service.update_user.call_args[0]
        assert call_args[0] == mock_user.keycloak_id
        assert set(call_args[1].keys()) <= {
            "username",
            "email",
            "firstName",
            "lastName",
        }
        mock_user_repository.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_user_profile_last_name(
        self, mock_user_repository, mock_user, mock_keycloak_service
    ):
        """Test updating user profile last name."""
        mock_user_repository.get_by_id.return_value = mock_user
        mock_user_repository.update.return_value = mock_user
        mock_user_repository.commit = AsyncMock()
        mock_keycloak_service.update_user = AsyncMock()

        service = UserService(
            user_repository=mock_user_repository,
            keycloak_service=mock_keycloak_service,
        )

        result = await service.update_user_profile(
            user=mock_user,
            last_name="NewLastName",
        )

        assert result == mock_user
        mock_keycloak_service.update_user.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_user_profile_username_success(
        self, mock_user_repository, mock_user, mock_keycloak_service
    ):
        """Test updating user profile username."""
        mock_user_repository.get_by_id.return_value = mock_user
        mock_user_repository.update.return_value = mock_user
        mock_user_repository.commit = AsyncMock()
        mock_keycloak_service.check_username_exists = AsyncMock(return_value=False)
        mock_keycloak_service.update_user = AsyncMock()

        service = UserService(
            user_repository=mock_user_repository,
            keycloak_service=mock_keycloak_service,
        )

        result = await service.update_user_profile(
            user=mock_user,
            username="newusername",
        )

        assert result == mock_user
        mock_keycloak_service.check_username_exists.assert_called_once_with(
            "newusername", exclude_keycloak_id=mock_user.keycloak_id
        )

    @pytest.mark.asyncio
    async def test_update_user_profile_username_already_exists(
        self, mock_user_repository, mock_user, mock_keycloak_service
    ):
        """Test UsernameAlreadyInUseError when username is taken."""
        mock_user_repository.get_by_id.return_value = mock_user
        mock_keycloak_service.check_username_exists = AsyncMock(return_value=True)

        service = UserService(
            user_repository=mock_user_repository,
            keycloak_service=mock_keycloak_service,
        )

        with pytest.raises(UsernameAlreadyInUseError):
            await service.update_user_profile(
                user=mock_user,
                username="existingusername",
            )

    @pytest.mark.asyncio
    async def test_update_user_profile_no_keycloak_service(
        self, mock_user_repository, mock_user
    ):
        """Test KeycloakCommunicationError when keycloak_service is not provided."""
        service = UserService(
            user_repository=mock_user_repository,
            keycloak_service=None,
        )

        with pytest.raises(KeycloakCommunicationError):
            await service.update_user_profile(
                user=mock_user,
                first_name="NewName",
            )

    @pytest.mark.asyncio
    async def test_update_user_profile_user_not_found_by_id(
        self, mock_user_repository, mock_user, mock_keycloak_service
    ):
        """Test UserNotFoundError when user not found by ID or keycloak_id."""
        mock_user_repository.get_by_id.return_value = None
        mock_user_repository.get_by_keycloak_id.return_value = None

        service = UserService(
            user_repository=mock_user_repository,
            keycloak_service=mock_keycloak_service,
        )

        with pytest.raises(UserNotFoundError):
            await service.update_user_profile(
                user=mock_user,
                first_name="NewName",
            )

    @pytest.mark.asyncio
    async def test_update_user_profile_fallback_to_keycloak_id(
        self, mock_user_repository, mock_user, mock_keycloak_service
    ):
        """Test fallback to keycloak_id when not found by id."""
        mock_user_repository.get_by_id.return_value = None
        mock_user_repository.get_by_keycloak_id.return_value = mock_user
        mock_user_repository.update.return_value = mock_user
        mock_user_repository.commit = AsyncMock()
        mock_keycloak_service.update_user = AsyncMock()

        service = UserService(
            user_repository=mock_user_repository,
            keycloak_service=mock_keycloak_service,
        )

        result = await service.update_user_profile(
            user=mock_user,
            first_name="NewName",
        )

        assert result == mock_user
        mock_user_repository.get_by_keycloak_id.assert_called_once_with(mock_user.keycloak_id)

    @pytest.mark.asyncio
    async def test_update_user_profile_with_avatar(
        self, mock_user_repository, mock_user, mock_keycloak_service
    ):
        """Test updating user profile with avatar."""
        mock_user_repository.get_by_id.return_value = mock_user
        mock_user_repository.update.return_value = mock_user
        mock_user_repository.commit = AsyncMock()
        mock_keycloak_service.update_user = AsyncMock()

        # Mock avatar file
        mock_avatar = MagicMock()
        mock_avatar.filename = "avatar.jpg"

        service = UserService(
            user_repository=mock_user_repository,
            keycloak_service=mock_keycloak_service,
        )

        with patch("auth_service.services.user_service.upload_image") as mock_upload:
            mock_upload.return_value = {"url": "https://s3.example.com/avatar.jpg"}

            result = await service.update_user_profile(
                user=mock_user,
                avatar=mock_avatar,
            )

            assert result == mock_user
            mock_upload.assert_called_once()
            mock_keycloak_service.update_user.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_user_profile_no_updates(
        self, mock_user_repository, mock_user, mock_keycloak_service
    ):
        """Test update_user_profile with no changes returns original user."""
        mock_user_repository.get_by_id.return_value = mock_user

        service = UserService(
            user_repository=mock_user_repository,
            keycloak_service=mock_keycloak_service,
        )

        result = await service.update_user_profile(user=mock_user)

        assert result == mock_user
        mock_user_repository.update.assert_not_called()


class TestUserServiceSuspendUnsuspend:
    """Tests for UserService suspend/unsuspend methods."""

    @pytest.mark.asyncio
    async def test_suspend_user_success(self, mock_user_repository, mock_user):
        """Test successful user suspension."""
        mock_user_repository.get_by_id.return_value = mock_user
        mock_user_repository.update.return_value = mock_user
        mock_user_repository.commit = AsyncMock()

        service = UserService(user_repository=mock_user_repository)

        # Call the second suspend_user method (admin)
        await service.suspend_user(mock_user.id)

        mock_user_repository.update.assert_called_once_with(
            mock_user.id, {"enabled": False}
        )
        mock_user_repository.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_suspend_user_not_found(self, mock_user_repository):
        """Test UserNotFoundError when suspending non-existent user."""
        user_id = uuid4()
        mock_user_repository.get_by_id.return_value = None

        service = UserService(user_repository=mock_user_repository)

        with pytest.raises(UserNotFoundError):
            await service.suspend_user(user_id)

    @pytest.mark.asyncio
    async def test_unsuspend_user_success(self, mock_user_repository, mock_user):
        """Test successful user unsuspension."""
        mock_user.enabled = False
        mock_user_repository.get_by_id.return_value = mock_user
        mock_user_repository.update.return_value = mock_user
        mock_user_repository.commit = AsyncMock()

        service = UserService(user_repository=mock_user_repository)

        await service.unsuspend_user(mock_user.id)

        mock_user_repository.update.assert_called_once_with(
            mock_user.id, {"enabled": True}
        )
        mock_user_repository.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_unsuspend_user_not_found(self, mock_user_repository):
        """Test UserNotFoundError when unsuspending non-existent user."""
        user_id = uuid4()
        mock_user_repository.get_by_id.return_value = None

        service = UserService(user_repository=mock_user_repository)

        with pytest.raises(UserNotFoundError):
            await service.unsuspend_user(user_id)


class TestUserServiceUpdateUserWithUsernameCheck:
    """Tests for UserService.update_user with username validation."""

    @pytest.mark.asyncio
    async def test_update_user_username_conflict(self, mock_user_repository, mock_user):
        """Test UsernameAlreadyInUseError when username is already used by another user."""
        other_keycloak_id = "other-keycloak-id"

        service = UserService(user_repository=mock_user_repository)

        with pytest.raises(UsernameAlreadyInUseError):
            await service.update_user(
                mock_user.id,
                {"username": "newusername"},
                check_username="newusername",
                existing_username_keycloak_id=other_keycloak_id,
            )

    @pytest.mark.asyncio
    async def test_update_user_username_same_user(self, mock_user_repository, mock_user):
        """Test update_user when username check passes for same user."""
        mock_user_repository.update.return_value = mock_user
        mock_user_repository.commit = AsyncMock()

        service = UserService(user_repository=mock_user_repository)

        result = await service.update_user(
            mock_user.id,
            {"username": "newusername"},
            check_username="newusername",
            existing_username_keycloak_id=str(mock_user.id),
        )

        assert result == mock_user
        mock_user_repository.update.assert_called_once()


class TestUserServiceGetAllUsersWithRoles:
    """Tests for UserService.get_all_users_with_roles method."""

    @pytest.mark.asyncio
    async def test_get_all_users_with_roles_success(self, mock_user_repository, mock_user):
        """Test get_all_users_with_roles returns enriched user data."""
        mock_user_repository.get_all.return_value = [mock_user]

        service = UserService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.user_service.AuthenticationService.get_role_from_user"
        ) as mock_get_roles:
            mock_get_roles.return_value = ["player", "admin"]

            result = await service.get_all_users_with_roles()

            assert len(result) == 1
            assert result[0].is_admin is True
            assert "admin" in result[0].roles

    @pytest.mark.asyncio
    async def test_get_all_users_with_roles_exception_handling(
        self, mock_user_repository, mock_user
    ):
        """Test get_all_users_with_roles handles exceptions gracefully."""
        mock_user_repository.get_all.return_value = [mock_user]

        service = UserService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.user_service.AuthenticationService.get_role_from_user"
        ) as mock_get_roles:
            mock_get_roles.side_effect = Exception("Keycloak error")

            result = await service.get_all_users_with_roles()

            assert len(result) == 1
            assert result[0].roles == []
            assert result[0].is_admin is False

    @pytest.mark.asyncio
    async def test_get_all_users_with_roles_no_admin(self, mock_user_repository, mock_user):
        """Test get_all_users_with_roles when user has no admin role."""
        mock_user_repository.get_all.return_value = [mock_user]

        service = UserService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.user_service.AuthenticationService.get_role_from_user"
        ) as mock_get_roles:
            mock_get_roles.return_value = ["player"]

            result = await service.get_all_users_with_roles()

            assert len(result) == 1
            assert result[0].is_admin is False
            assert "player" in result[0].roles
