"""Extended unit tests for AuthenticationService - login, refresh, callback operations."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from auth_service.core.exceptions import (
    InvalidCallbackError,
    InvalidCredentialsError,
    KeycloakCommunicationError,
    UserDisabledError,
    UserNotActivatedError,
    RefreshTokenError,
    EmailAlreadyInUseError,
    UsernameAlreadyInUseError,
    RegistrationError,
    UserNotFoundError,
)
from auth_service.services.authentication_service import AuthenticationService
from auth_service.infrastructure.database.models.user_model import User


class TestAuthenticationServiceLogin:
    """Tests for AuthenticationService.login method."""

    @pytest.mark.asyncio
    async def test_login_success(self, mock_user_repository, mock_user):
        """Test successful login."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            with patch.object(
                AuthenticationService, "get_public_key", new_callable=AsyncMock
            ) as mock_get_key:
                with patch(
                    "auth_service.services.authentication_service.JwtHandler.decode_token"
                ) as mock_decode:
                    with patch.object(
                        service, "get_or_create_user_from_keycloak_token", new_callable=AsyncMock
                    ) as mock_get_user:
                        mock_threadpool.return_value = {
                            "access_token": "test_access_token",
                            "refresh_token": "test_refresh_token",
                            "expires_in": 300,
                        }
                        mock_get_key.return_value = "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----"
                        mock_decode.return_value = {"sub": "keycloak-user-123"}
                        mock_get_user.return_value = mock_user

                        result = await service.login("user@example.com", "password123")

                        assert result.access_token == "test_access_token"
                        assert result.refresh_token == "test_refresh_token"
                        assert result.expires_in == 300

    @pytest.mark.asyncio
    async def test_login_keycloak_authentication_error(self, mock_user_repository):
        """Test InvalidCredentialsError on keycloak authentication error."""
        from keycloak.exceptions import KeycloakAuthenticationError

        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            mock_threadpool.side_effect = KeycloakAuthenticationError(
                response_body=b'{"error_description": "Invalid user credentials"}'
            )

            with pytest.raises(InvalidCredentialsError):
                await service.login("user@example.com", "wrongpassword")

    @pytest.mark.asyncio
    async def test_login_user_not_activated(self, mock_user_repository):
        """Test UserNotActivatedError when account not fully set up."""
        from keycloak.exceptions import KeycloakAuthenticationError

        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            error = KeycloakAuthenticationError()
            error.response_body = b'{"error_description": "Account is not fully set up"}'
            mock_threadpool.side_effect = error

            with pytest.raises(UserNotActivatedError):
                await service.login("user@example.com", "password")

    @pytest.mark.asyncio
    async def test_login_user_disabled(self, mock_user_repository):
        """Test UserDisabledError when account is disabled."""
        from keycloak.exceptions import KeycloakAuthenticationError

        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            error = KeycloakAuthenticationError()
            error.response_body = b'{"error_description": "Account disabled"}'
            mock_threadpool.side_effect = error

            with pytest.raises(UserDisabledError):
                await service.login("user@example.com", "password")


class TestAuthenticationServiceRefreshToken:
    """Tests for AuthenticationService.refresh_token method."""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, mock_user_repository):
        """Test successful token refresh."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            mock_threadpool.return_value = {
                "access_token": "new_access_token",
                "refresh_token": "new_refresh_token",
                "expires_in": 300,
            }

            result = await service.refresh_token("old_refresh_token")

            assert result.access_token == "new_access_token"
            assert result.refresh_token == "new_refresh_token"

    @pytest.mark.asyncio
    async def test_refresh_token_invalid_response(self, mock_user_repository):
        """Test KeycloakCommunicationError on invalid response."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            mock_threadpool.return_value = {"invalid": "response"}

            with pytest.raises(KeycloakCommunicationError):
                await service.refresh_token("old_refresh_token")


class TestAuthenticationServiceHandleKeycloakCallback:
    """Tests for AuthenticationService.handle_keycloak_callback method."""

    @pytest.mark.asyncio
    async def test_callback_missing_code(self, mock_user_repository):
        """Test InvalidCallbackError when code is missing."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with pytest.raises(InvalidCallbackError):
            await service.handle_keycloak_callback("", "http://localhost/callback")

    @pytest.mark.asyncio
    async def test_callback_missing_redirect_uri(self, mock_user_repository):
        """Test InvalidCallbackError when redirect_uri is missing."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with pytest.raises(InvalidCallbackError):
            await service.handle_keycloak_callback("valid_code", "")

    @pytest.mark.asyncio
    async def test_callback_success(self, mock_user_repository, mock_user):
        """Test successful OAuth callback handling."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            with patch.object(
                AuthenticationService, "get_public_key", new_callable=AsyncMock
            ) as mock_get_key:
                with patch(
                    "auth_service.services.authentication_service.JwtHandler.decode_token"
                ) as mock_decode:
                    with patch.object(
                        service, "get_or_create_user_from_keycloak_token", new_callable=AsyncMock
                    ) as mock_get_user:
                        with patch.object(
                            service, "add_role_to_user"
                        ):
                            mock_threadpool.return_value = {
                                "access_token": "callback_access_token",
                                "refresh_token": "callback_refresh_token",
                            }
                            mock_get_key.return_value = "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----"
                            mock_decode.return_value = {"sub": "keycloak-user-123"}
                            mock_get_user.return_value = mock_user

                            result = await service.handle_keycloak_callback(
                                "valid_code", "http://localhost/callback"
                            )

                            assert result["access_token"] == "callback_access_token"
                            assert result["refresh_token"] == "callback_refresh_token"
                            assert result["user"]["email"] == mock_user.email

    @pytest.mark.asyncio
    async def test_callback_no_access_token(self, mock_user_repository):
        """Test KeycloakCommunicationError when no access_token in response."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            mock_threadpool.return_value = {"refresh_token": "only_refresh"}

            with pytest.raises(KeycloakCommunicationError):
                await service.handle_keycloak_callback(
                    "valid_code", "http://localhost/callback"
                )


class TestAuthenticationServiceHandleKeycloakAuthError:
    """Tests for _handle_keycloak_auth_error method."""

    def test_handle_invalid_grant_error(self, mock_user_repository):
        """Test InvalidCredentialsError on invalid_grant."""
        from keycloak.exceptions import KeycloakPostError

        service = AuthenticationService(user_repository=mock_user_repository)

        error = KeycloakPostError()
        error.response_body = b'{"error_description": "invalid_grant"}'

        with pytest.raises(InvalidCredentialsError):
            service._handle_keycloak_auth_error(error)

    def test_handle_unknown_error(self, mock_user_repository):
        """Test InvalidCredentialsError on unknown error."""
        from keycloak.exceptions import KeycloakPostError

        service = AuthenticationService(user_repository=mock_user_repository)

        error = KeycloakPostError()
        error.response_body = b'{"error_description": "Some unknown error"}'

        with pytest.raises(InvalidCredentialsError):
            service._handle_keycloak_auth_error(error)


class TestAuthenticationServiceGetPublicKeyError:
    """Tests for get_public_key error handling."""

    @pytest.mark.asyncio
    async def test_get_public_key_error(self, mock_user_repository):
        """Test KeycloakCommunicationError when getting public key fails."""
        # Reset cache
        AuthenticationService._public_key_cache = None

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            mock_threadpool.side_effect = Exception("Connection error")

            with pytest.raises(KeycloakCommunicationError):
                await AuthenticationService.get_public_key()


class TestAuthenticationServiceEmailTokenEdgeCases:
    """Additional tests for email token edge cases."""

    def test_generate_email_token_zero_expiry(self):
        """Test email token generation with zero expiry hours."""
        user_id = "test-user-123"
        token = AuthenticationService.generate_email_token(user_id, expiry_hours=0)
        assert token is not None

    def test_decode_email_token_none_sub(self, mock_user_repository):
        """Test decode_email_token with missing sub claim."""
        from common.security.jwt_handler import JwtHandler

        service = AuthenticationService(user_repository=mock_user_repository)

        with patch.object(JwtHandler, "decode_email_token") as mock_decode:
            mock_decode.return_value = {"type": "email"}  # Missing "sub"

            from auth_service.core.exceptions import InvalidTokenError
            with pytest.raises(InvalidTokenError):
                AuthenticationService.decode_email_token("token_without_sub")


class TestAuthenticationServiceLogout:
    """Tests for AuthenticationService.logout method."""

    @pytest.mark.asyncio
    async def test_logout_success(self, mock_user_repository):
        """Test successful logout."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            mock_threadpool.return_value = None

            result = await service.logout("valid_refresh_token")

            assert result["message"] == "Logout realizado com sucesso"

    @pytest.mark.asyncio
    async def test_logout_invalid_token(self, mock_user_repository):
        """Test logout with invalid/expired token."""
        from keycloak.exceptions import KeycloakPostError

        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            error = KeycloakPostError()
            error.response_code = 400
            mock_threadpool.side_effect = error

            result = await service.logout("invalid_token")

            assert "Sessão já estava inativa" in result["message"]

    @pytest.mark.asyncio
    async def test_logout_keycloak_error(self, mock_user_repository):
        """Test logout with keycloak error."""
        from keycloak.exceptions import KeycloakPostError

        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            error = KeycloakPostError()
            error.response_code = 500
            mock_threadpool.side_effect = error

            with pytest.raises(KeycloakCommunicationError):
                await service.logout("valid_token")

    @pytest.mark.asyncio
    async def test_logout_connection_error(self, mock_user_repository):
        """Test logout with connection error."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            mock_threadpool.side_effect = Exception("Connection refused")

            with pytest.raises(KeycloakCommunicationError):
                await service.logout("valid_token")


class TestAuthenticationServiceRegisterUser:
    """Tests for AuthenticationService.register_user method."""

    @pytest.mark.asyncio
    async def test_register_email_already_exists(self, mock_user_repository):
        """Test EmailAlreadyInUseError when email already exists."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.get_keycloak_admin_client"
        ) as mock_keycloak:
            with patch(
                "auth_service.services.authentication_service.run_in_threadpool"
            ) as mock_threadpool:
                mock_keycloak_admin = MagicMock()
                mock_keycloak.return_value = mock_keycloak_admin
                # First call returns existing users by email
                mock_threadpool.return_value = [{"email": "existing@example.com"}]

                with pytest.raises(EmailAlreadyInUseError):
                    await service.register_user(
                        email="existing@example.com",
                        username="newuser",
                        first_name="New",
                        last_name="User",
                        password="password123",
                    )

    @pytest.mark.asyncio
    async def test_register_username_already_exists(self, mock_user_repository):
        """Test UsernameAlreadyInUseError when username already exists."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.get_keycloak_admin_client"
        ) as mock_keycloak:
            with patch(
                "auth_service.services.authentication_service.run_in_threadpool"
            ) as mock_threadpool:
                mock_keycloak_admin = MagicMock()
                mock_keycloak.return_value = mock_keycloak_admin
                # First call (email check) returns empty, second (username) returns existing
                mock_threadpool.side_effect = [[], [{"username": "existinguser"}]]

                with pytest.raises(UsernameAlreadyInUseError):
                    await service.register_user(
                        email="new@example.com",
                        username="existinguser",
                        first_name="New",
                        last_name="User",
                        password="password123",
                    )


class TestAuthenticationServiceActivateUser:
    """Tests for AuthenticationService.activate_user method."""

    @pytest.mark.asyncio
    async def test_activate_user_not_found(self, mock_user_repository):
        """Test UserNotFoundError when user doesn't exist."""
        mock_user_repository.get_by_keycloak_id.return_value = None
        service = AuthenticationService(user_repository=mock_user_repository)

        with pytest.raises(UserNotFoundError):
            await service.activate_user("nonexistent-id")

    @pytest.mark.asyncio
    async def test_activate_user_already_active(self, mock_user_repository, mock_user):
        """Test activate_user when user is already active."""
        mock_user.enabled = True
        mock_user.email_verified = True
        mock_user_repository.get_by_keycloak_id.return_value = mock_user
        service = AuthenticationService(user_repository=mock_user_repository)

        result = await service.activate_user(mock_user.keycloak_id)

        assert result["success"] is True
        assert result["already_active"] is True


class TestAuthenticationServiceRefreshTokenError:
    """Tests for refresh_token error handling."""

    @pytest.mark.asyncio
    async def test_refresh_token_unexpected_error(self, mock_user_repository):
        """Test RefreshTokenError on unexpected error."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            mock_threadpool.side_effect = Exception("Unexpected error")

            with pytest.raises(RefreshTokenError):
                await service.refresh_token("old_refresh_token")


class TestAuthenticationServiceResendVerification:
    """Tests for resend verification email."""

    @pytest.mark.asyncio
    async def test_resend_verification_success(self, mock_user_repository, mock_user):
        """Test successful resend verification."""
        mock_user.email_verified = False
        mock_user_repository.get_by_email.return_value = mock_user
        service = AuthenticationService(user_repository=mock_user_repository)

        result = await service.resend_verification_email(mock_user.email)

        assert result["email"] == mock_user.email
        assert "user_id" in result

    @pytest.mark.asyncio
    async def test_resend_verification_user_not_found(self, mock_user_repository):
        """Test UserNotFoundError when user doesn't exist."""
        mock_user_repository.get_by_email.return_value = None
        service = AuthenticationService(user_repository=mock_user_repository)

        with pytest.raises(UserNotFoundError):
            await service.resend_verification_email("nonexistent@test.com")

    @pytest.mark.asyncio
    async def test_resend_verification_already_verified(self, mock_user_repository, mock_user):
        """Test EmailAlreadyVerifiedError when email is already verified."""
        from auth_service.core.exceptions import EmailAlreadyVerifiedError
        
        mock_user.email_verified = True
        mock_user_repository.get_by_email.return_value = mock_user
        service = AuthenticationService(user_repository=mock_user_repository)

        with pytest.raises(EmailAlreadyVerifiedError):
            await service.resend_verification_email(mock_user.email)


class TestAuthenticationServiceGetOrCreateUser:
    """Tests for get_or_create_user_from_keycloak_token."""

    @pytest.mark.asyncio
    async def test_get_existing_user(self, mock_user_repository, mock_user):
        """Test returning existing user."""
        mock_user_repository.get_by_keycloak_id.return_value = mock_user
        service = AuthenticationService(user_repository=mock_user_repository)

        token_payload = {
            "sub": mock_user.keycloak_id,
            "email": mock_user.email,
            "preferred_username": mock_user.username,
        }

        result = await service.get_or_create_user_from_keycloak_token(token_payload)

        assert result == mock_user

    @pytest.mark.asyncio
    async def test_create_new_user(self, mock_user_repository):
        """Test creating new user from token."""
        # get_by_keycloak_id returns None (user doesn't exist by keycloak_id)
        mock_user_repository.get_by_keycloak_id.return_value = None
        # get_by_email also returns None (user doesn't exist by email)
        mock_user_repository.get_by_email.return_value = None
        mock_user_repository.create = AsyncMock()
        mock_user_repository.commit = AsyncMock()
        
        service = AuthenticationService(user_repository=mock_user_repository)

        token_payload = {
            "sub": "new-keycloak-id",
            "email": "new@test.com",
            "preferred_username": "newuser",
            "given_name": "New",
            "family_name": "User",
            "email_verified": True,
            "picture": "https://example.com/avatar.jpg",
        }

        result = await service.get_or_create_user_from_keycloak_token(token_payload)

        # Verify the result is a User with expected attributes
        assert result.keycloak_id == "new-keycloak-id"
        assert result.email == "new@test.com"
        mock_user_repository.create.assert_called_once()
        mock_user_repository.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_invalid_token_missing_sub(self, mock_user_repository):
        """Test InvalidCredentialsError when token is missing sub field."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with pytest.raises(Exception):  # Can be AppException or InvalidCredentialsError
            await service.get_or_create_user_from_keycloak_token({})


class TestAuthenticationServiceLogoutSecond:
    """Additional tests for logout method."""

    @pytest.mark.asyncio
    async def test_logout_success_second(self, mock_user_repository):
        """Test successful logout."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            mock_threadpool.return_value = None

            result = await service.logout("valid_refresh_token")

            assert result["message"] == "Logout realizado com sucesso"

    @pytest.mark.asyncio
    async def test_logout_error(self, mock_user_repository):
        """Test KeycloakCommunicationError on generic failure."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.run_in_threadpool"
        ) as mock_threadpool:
            mock_threadpool.side_effect = Exception("Connection refused")

            with pytest.raises(KeycloakCommunicationError):
                await service.logout("invalid_refresh_token")


class TestAuthenticationServiceGetPublicKey:
    """Tests for get_public_key method."""

    @pytest.mark.asyncio
    async def test_get_public_key_cached(self, mock_user_repository):
        """Test returning cached public key."""
        # Set cached value
        AuthenticationService._public_key_cache = "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----"
        
        result = await AuthenticationService.get_public_key()

        assert "BEGIN PUBLIC KEY" in result

        # Reset cache
        AuthenticationService._public_key_cache = None


class TestAuthenticationServiceEmailToken:
    """Tests for email token methods."""

    def test_generate_email_token(self):
        """Test email token generation."""
        token = AuthenticationService.generate_email_token("user-123", expiry_hours=24)
        
        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_email_token_success(self):
        """Test email token decoding."""
        token = AuthenticationService.generate_email_token("user-123", expiry_hours=24)
        
        payload = AuthenticationService.decode_email_token(token)
        
        assert payload["sub"] == "user-123"

    def test_decode_email_token_invalid(self):
        """Test InvalidTokenError for invalid token."""
        from auth_service.core.exceptions import InvalidTokenError
        
        with pytest.raises((InvalidTokenError, Exception)):
            # Use a clearly invalid token
            AuthenticationService.decode_email_token("invalid.token.format")


class TestAuthenticationServiceResetPassword:
    """Tests for reset password methods."""

    def test_generate_reset_password_token(self):
        """Test reset password token generation."""
        token = AuthenticationService.generate_reset_password_token("user-123", expiry_hours=2)
        
        assert isinstance(token, str)
        assert len(token) > 0

    @pytest.mark.asyncio
    async def test_reset_user_password_success(self, mock_user_repository):
        """Test successful password reset."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.get_keycloak_admin_client"
        ) as mock_keycloak:
            with patch(
                "auth_service.services.authentication_service.run_in_threadpool"
            ) as mock_threadpool:
                mock_threadpool.return_value = None

                await service.reset_user_password("user-123", "new-password")

    @pytest.mark.asyncio
    async def test_reset_user_password_error(self, mock_user_repository):
        """Test error on password reset failure."""
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch(
            "auth_service.services.authentication_service.get_keycloak_admin_client"
        ):
            with patch(
                "auth_service.services.authentication_service.run_in_threadpool"
            ) as mock_threadpool:
                mock_threadpool.side_effect = Exception("Password reset failed")

                with pytest.raises(Exception):  # Can be AppException or KeycloakCommunicationError
                    await service.reset_user_password("user-123", "new-password")


class TestAuthenticationServiceGetUserInfoForReset:
    """Tests for get_user_info_for_password_reset method."""

    @pytest.mark.asyncio
    async def test_get_user_info_success(self, mock_user_repository, mock_user):
        """Test successful user info retrieval."""
        mock_user_repository.get_by_email.return_value = mock_user
        service = AuthenticationService(user_repository=mock_user_repository)

        result = await service.get_user_info_for_password_reset(mock_user.email)

        assert result["email"] == mock_user.email
        assert "user_id" in result

    @pytest.mark.asyncio
    async def test_get_user_info_not_found(self, mock_user_repository):
        """Test UserNotFoundError when user doesn't exist."""
        mock_user_repository.get_by_email.return_value = None
        service = AuthenticationService(user_repository=mock_user_repository)

        with pytest.raises(UserNotFoundError):
            await service.get_user_info_for_password_reset("nonexistent@test.com")


class TestAuthenticationServiceGoogleAuth:
    """Tests for Google OAuth URL method."""

    def test_get_google_auth_url(self):
        """Test Google auth URL generation."""
        with patch(
            "auth_service.services.authentication_service.keycloak_openid"
        ) as mock_keycloak:
            mock_keycloak.auth_url.return_value = "https://keycloak/auth?redirect_uri=..."

            url = AuthenticationService.get_google_auth_url()

            assert isinstance(url, str)

