"""Unit tests for AuthenticationService."""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import AsyncMock, patch, MagicMock

from auth_service.core.exceptions import (
    InvalidTokenError,
    TokenExpiredError,
    UserNotFoundError,
)
from auth_service.services.authentication_service import AuthenticationService
from auth_service.infrastructure.database.models.user_model import User


class TestAuthenticationServiceTokenGeneration:
    """Tests for token generation methods."""

    def test_generate_email_token(self):
        """Test email token generation."""
        user_id = "test-user-123"
        
        token = AuthenticationService.generate_email_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_generate_email_token_with_custom_expiry(self):
        """Test email token generation with custom expiry hours."""
        user_id = "test-user-123"
        
        token = AuthenticationService.generate_email_token(user_id, expiry_hours=48)
        
        assert token is not None
        assert isinstance(token, str)

    def test_generate_reset_password_token(self):
        """Test reset password token generation."""
        user_id = "test-user-123"
        
        token = AuthenticationService.generate_reset_password_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_generate_reset_password_token_with_custom_expiry(self):
        """Test reset password token generation with custom expiry."""
        user_id = "test-user-123"
        
        token = AuthenticationService.generate_reset_password_token(user_id, expiry_hours=4)
        
        assert token is not None


class TestAuthenticationServiceTokenDecoding:
    """Tests for token decoding methods."""

    def test_decode_email_token_success(self):
        """Test successful email token decoding."""
        user_id = "test-user-123"
        token = AuthenticationService.generate_email_token(user_id)
        
        payload = AuthenticationService.decode_email_token(token)
        
        assert payload is not None
        assert payload.get("sub") == user_id

    def test_decode_email_token_invalid(self):
        """Test InvalidTokenError for invalid token."""
        invalid_token = "invalid.token.here"
        
        with pytest.raises(InvalidTokenError):
            AuthenticationService.decode_email_token(invalid_token)

    def test_decode_email_token_expired(self):
        """Test TokenExpiredError for expired token."""
        user_id = "test-user-123"
        # Create token that expires in the past (negative expiry)
        token = AuthenticationService.generate_email_token(user_id, expiry_hours=-1)
        
        with pytest.raises(TokenExpiredError):
            AuthenticationService.decode_email_token(token)

    def test_decode_reset_password_token_success(self):
        """Test successful reset password token decoding."""
        user_id = "test-user-123"
        token = AuthenticationService.generate_reset_password_token(user_id)
        
        payload = AuthenticationService.decode_reset_password_token(token)
        
        assert payload is not None
        assert payload.get("sub") == user_id
        assert payload.get("type") == "reset_password"

    def test_decode_reset_password_token_invalid_type(self):
        """Test InvalidTokenError for wrong token type."""
        user_id = "test-user-123"
        # Generate an email token but try to decode as reset password token
        token = AuthenticationService.generate_email_token(user_id)
        
        with pytest.raises(InvalidTokenError):
            AuthenticationService.decode_reset_password_token(token)

    def test_decode_reset_password_token_invalid(self):
        """Test InvalidTokenError for invalid reset password token."""
        invalid_token = "invalid.token.here"
        
        with pytest.raises(InvalidTokenError):
            AuthenticationService.decode_reset_password_token(invalid_token)


class TestAuthenticationServicePasswordReset:
    """Tests for password reset methods."""

    @pytest.mark.asyncio
    async def test_get_user_info_for_password_reset_success(self, mock_user_repository, mock_user):
        """Test successful retrieval of user info for password reset."""
        mock_user_repository.get_by_email.return_value = mock_user
        service = AuthenticationService(user_repository=mock_user_repository)

        result = await service.get_user_info_for_password_reset(mock_user.email)

        assert result["user_id"] == str(mock_user.keycloak_id)
        assert result["email"] == mock_user.email
        assert result["name"] == mock_user.first_name or mock_user.username
        mock_user_repository.get_by_email.assert_called_once_with(mock_user.email)

    @pytest.mark.asyncio
    async def test_get_user_info_for_password_reset_user_not_found(self, mock_user_repository):
        """Test UserNotFoundError when email not found."""
        email = "nonexistent@example.com"
        mock_user_repository.get_by_email.return_value = None
        service = AuthenticationService(user_repository=mock_user_repository)

        with pytest.raises(UserNotFoundError):
            await service.get_user_info_for_password_reset(email)

    @pytest.mark.asyncio
    async def test_reset_user_password_success(self, mock_user_repository):
        """Test successful password reset."""
        user_id = "keycloak-user-123"
        new_password = "new_secure_password"
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch("auth_service.services.authentication_service.get_keycloak_admin_client") as mock_keycloak:
            with patch("auth_service.services.authentication_service.run_in_threadpool") as mock_threadpool:
                mock_keycloak_admin = MagicMock()
                mock_keycloak.return_value = mock_keycloak_admin
                mock_threadpool.return_value = None

                await service.reset_user_password(user_id, new_password)

                mock_threadpool.assert_called_once()

    @pytest.mark.asyncio
    async def test_reset_user_password_error(self, mock_user_repository):
        """Test AppException when password reset fails."""
        user_id = "keycloak-user-123"
        new_password = "new_password"
        service = AuthenticationService(user_repository=mock_user_repository)

        with patch("auth_service.services.authentication_service.get_keycloak_admin_client") as mock_keycloak:
            with patch("auth_service.services.authentication_service.run_in_threadpool") as mock_threadpool:
                mock_keycloak.return_value = MagicMock()
                mock_threadpool.side_effect = Exception("Keycloak error")

                with pytest.raises(Exception):
                    await service.reset_user_password(user_id, new_password)


class TestAuthenticationServicePublicKeyCache:
    """Tests for public key caching."""

    def test_public_key_cache_initialization(self):
        """Test that public key cache starts as None."""
        assert AuthenticationService._public_key_cache is None

    @pytest.mark.asyncio
    async def test_get_public_key_caches_result(self, mock_user_repository):
        """Test that get_public_key caches the result."""
        service = AuthenticationService(user_repository=mock_user_repository)

        # Reset cache first
        AuthenticationService._public_key_cache = None

        with patch("auth_service.services.authentication_service.keycloak_openid") as mock_keycloak_openid:
            with patch("auth_service.services.authentication_service.run_in_threadpool") as mock_threadpool:
                mock_threadpool.return_value = "test-key-content"

                # First call
                key1 = await AuthenticationService.get_public_key()
                # Second call
                key2 = await AuthenticationService.get_public_key()

                # Should contain BEGIN and END markers
                assert "-----BEGIN PUBLIC KEY-----" in key1
                assert "-----END PUBLIC KEY-----" in key1
                # Both calls should return the same cached value
                assert key1 == key2


class TestAuthenticationServiceGetUserInfoForPasswordReset:
    """Tests for get_user_info_for_password_reset method."""

    @pytest.mark.asyncio
    async def test_includes_user_name_fallback(self, mock_user_repository):
        """Test that name uses username fallback when first_name is None."""
        mock_user = User(
            id=uuid4(),
            keycloak_id="keycloak-user-123",
            email="user@example.com",
            username="fallback_username",
            first_name=None,  # No first name
            last_name=None,
            avatar_url=None,
            enabled=True,
            email_verified=True,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        mock_user_repository.get_by_email.return_value = mock_user
        service = AuthenticationService(user_repository=mock_user_repository)

        result = await service.get_user_info_for_password_reset(mock_user.email)

        # Should use username as fallback
        assert result["name"] == "fallback_username"

    @pytest.mark.asyncio
    async def test_includes_correct_user_id_format(self, mock_user_repository, mock_user):
        """Test that user_id is returned as string."""
        mock_user_repository.get_by_email.return_value = mock_user
        service = AuthenticationService(user_repository=mock_user_repository)

        result = await service.get_user_info_for_password_reset(mock_user.email)

        assert isinstance(result["user_id"], str)
        assert result["user_id"] == str(mock_user.keycloak_id)
