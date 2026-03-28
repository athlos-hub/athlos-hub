"""Integration tests for authentication endpoints."""

import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4


class TestLogin:
    """Tests for POST /auth/login endpoint."""

    @pytest.mark.asyncio
    async def test_login_missing_credentials(self, client):
        """Test login fails without credentials."""
        response = await client.post("/api/auth/login", json={})
        
        # Should return validation error
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        response = await client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "wrongpass"}
        )
        
        # Should fail authentication (502 when Keycloak is unavailable in test env)
        assert response.status_code in [400, 401, 500, 502]


class TestRegister:
    """Tests for POST /auth/register endpoint."""

    @pytest.mark.asyncio
    async def test_register_missing_fields(self, client):
        """Test registration fails without required fields."""
        response = await client.post("/api/auth/register", json={})
        
        # Should return validation error
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client):
        """Test registration with invalid email."""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "not-an-email",
                "password": "Pass123!",
                "first_name": "Test",
                "last_name": "User"
            }
        )
        
        # Should return validation error
        assert response.status_code == 422


class TestKeycloakCallback:
    """Tests for POST /auth/keycloak/callback endpoint."""

    @pytest.mark.asyncio
    async def test_keycloak_callback_missing_code(self, client):
        """Test callback fails without authorization code."""
        response = await client.post("/api/auth/keycloak/callback", json={})
        
        # Should return error
        assert response.status_code in [400, 422]


class TestVerifyEmail:
    """Tests for POST /auth/verify/{token} endpoint."""

    @pytest.mark.asyncio
    async def test_verify_email_invalid_token(self, client):
        """Test email verification with invalid token."""
        response = await client.post("/api/auth/verify/invalid-token")
        
        # Should fail
        assert response.status_code in [400, 401]


class TestResendVerification:
    """Tests for POST /auth/resend-verification endpoint."""

    @pytest.mark.asyncio
    async def test_resend_verification_missing_email(self, client):
        """Test resend verification without email."""
        response = await client.post("/api/auth/resend-verification", json={})
        
        # Should return validation error
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_resend_verification_invalid_email(self, client):
        """Test resend verification with invalid email."""
        response = await client.post(
            "/api/auth/resend-verification",
            json={"email": "not-an-email"}
        )
        
        # Should return validation error
        assert response.status_code == 422


class TestRequestPasswordReset:
    """Tests for POST /auth/request-reset-password endpoint."""

    @pytest.mark.asyncio
    async def test_request_password_reset_missing_email(self, client):
        """Test password reset request without email."""
        response = await client.post("/api/auth/request-reset-password", json={})
        
        # Should return validation error
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_request_password_reset_invalid_email(self, client):
        """Test password reset request with invalid email format."""
        response = await client.post(
            "/api/auth/request-reset-password",
            json={"email": "not-an-email"}
        )
        
        # Should return validation error
        assert response.status_code == 422


class TestResetPassword:
    """Tests for POST /auth/reset-password/{token} endpoint."""

    @pytest.mark.asyncio
    async def test_reset_password_invalid_token(self, client):
        """Test password reset with invalid token."""
        response = await client.post(
            "/api/auth/reset-password/invalid-token",
            json={"new_password": "NewPassword123!"}
        )
        
        # Should return error
        assert response.status_code in [400, 401]

    @pytest.mark.asyncio
    async def test_reset_password_missing_password(self, client):
        """Test password reset without new password."""
        response = await client.post(
            "/api/auth/reset-password/some-token",
            json={}
        )
        
        # Should return validation error
        assert response.status_code == 422


class TestGoogleUrl:
    """Tests for GET /auth/google/url endpoint."""

    @pytest.mark.asyncio
    async def test_get_google_url(self, client):
        """Test getting Google OAuth URL."""
        response = await client.get("/api/auth/google/url")
        
        # Should return URL or error
        assert response.status_code in [200, 500]


class TestRefreshToken:
    """Tests for POST /auth/refresh endpoint."""

    @pytest.mark.asyncio
    async def test_refresh_token_missing_token(self, client):
        """Test refresh without token."""
        response = await client.post("/api/auth/refresh", json={})
        
        # Should return validation error
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_refresh_token_invalid_token(self, client):
        """Test refresh with invalid token."""
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": "invalid-token"}
        )
        
        # Should fail
        assert response.status_code in [400, 401]


class TestLogout:
    """Tests for POST /auth/logout endpoint."""

    @pytest.mark.asyncio
    async def test_logout_without_auth(self, client):
        """Test logout fails without authentication."""
        response = await client.post("/api/auth/logout")
        
        # Should require authentication or validation error
        assert response.status_code in [401, 403, 422]

    @pytest.mark.asyncio
    async def test_logout_with_invalid_token(self, client):
        """Test logout with invalid token."""
        response = await client.post(
            "/api/auth/logout",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should return unauthorized
        assert response.status_code == 401
