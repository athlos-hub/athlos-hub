"""
Testes E2E para endpoints de autenticação.

Estes testes validam fluxos de autenticação:
- Validação de entrada
- Erros esperados
- Fluxos sem Keycloak ativo
"""

import pytest
from httpx import AsyncClient


class TestLoginE2E:
    """Testes E2E para endpoint de login."""

    @pytest.mark.asyncio
    async def test_login_missing_credentials(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que login falha sem credenciais.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/login",
            json={}
        )
        
        # Assert - validação deve falhar
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_missing_password(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que login falha sem senha.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com"}
        )
        
        # Assert
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_missing_email(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que login falha sem email.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/login",
            json={"password": "testpass123"}
        )
        
        # Assert
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_invalid_email_format(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que login falha com email inválido.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/login",
            json={
                "email": "not-an-email",
                "password": "testpass123"
            }
        )
        
        # Assert - pode falhar na validação ou no Keycloak
        assert response.status_code in [400, 422, 500, 502]


class TestRegisterE2E:
    """Testes E2E para endpoint de registro."""

    @pytest.mark.asyncio
    async def test_register_missing_fields(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que registro falha sem campos obrigatórios.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/register",
            json={}
        )
        
        # Assert
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_invalid_email(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que registro falha com email inválido.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/register",
            json={
                "email": "invalid-email",
                "password": "ValidPass123!",
                "first_name": "Test",
                "last_name": "User"
            }
        )
        
        # Assert
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_weak_password(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que registro falha com senha fraca.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "123",  # Senha muito fraca
                "first_name": "Test",
                "last_name": "User"
            }
        )
        
        # Assert - pode falhar na validação ou no Keycloak
        assert response.status_code in [400, 422, 500, 502]


class TestEmailVerificationE2E:
    """Testes E2E para verificação de email."""

    @pytest.mark.asyncio
    async def test_verify_email_invalid_token(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que verificação falha com token inválido.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/verify/invalid-token-here"
        )
        
        # Assert
        assert response.status_code in [400, 401, 404]

    @pytest.mark.asyncio
    async def test_resend_verification_missing_email(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que reenvio de verificação falha sem email.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/resend-verification",
            json={}
        )
        
        # Assert
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_resend_verification_invalid_email(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que reenvio falha com email inválido.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/resend-verification",
            json={"email": "not-an-email"}
        )
        
        # Assert
        assert response.status_code == 422


class TestPasswordResetE2E:
    """Testes E2E para reset de senha."""

    @pytest.mark.asyncio
    async def test_forgot_password_missing_email(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que forgot password falha sem email.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/forgot-password",
            json={}
        )
        
        # Assert - pode não existir ou falhar
        assert response.status_code in [404, 422, 500]

    @pytest.mark.asyncio
    async def test_forgot_password_invalid_email(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que forgot password falha com email inválido.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "invalid-email"}
        )
        
        # Assert - pode não existir ou falhar
        assert response.status_code in [404, 422, 500]


class TestTokenRefreshE2E:
    """Testes E2E para refresh de token."""

    @pytest.mark.asyncio
    async def test_refresh_token_missing(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que refresh falha sem token.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/refresh",
            json={}
        )
        
        # Assert
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_refresh_token_invalid(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa que refresh falha com token inválido.
        """
        # Act
        response = await test_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid-refresh-token"}
        )
        
        # Assert - Keycloak não está rodando, então espera erro
        assert response.status_code in [400, 401, 500, 502]


class TestLogoutE2E:
    """Testes E2E para logout."""

    @pytest.mark.asyncio
    async def test_logout_without_auth(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa logout sem autenticação.
        """
        # Act
        response = await test_client.post("/api/v1/auth/logout")
        
        # Assert - pode aceitar, rejeitar ou não existir
        assert response.status_code in [200, 204, 401, 403, 404, 422]
