"""
Testes de Integração para as rotas de autenticação (/auth).

Testa os principais fluxos de autenticação:
- GET /auth/me - Obter dados do usuário autenticado
- POST /auth/login - Login com credenciais
- POST /auth/logout - Logout
- POST /auth/refresh - Renovar token
- POST /auth/register - Registro de novos usuários
- GET /auth/google/url - URL de autenticação Google/Keycloak
"""
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient
from src.models.user import User


class TestGetAuthenticatedUser:
    """Testes para GET /auth/me"""
    
    @pytest.mark.asyncio
    async def test_get_me_success(self, authenticated_client: AsyncClient, test_user: User):
        """Deve retornar os dados do usuário autenticado."""
        response = await authenticated_client.get("/auth/me")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username

        first_name = data.get("first_name") or data.get("firstName")
        last_name = data.get("last_name") or data.get("lastName")
        assert first_name == test_user.first_name
        assert last_name == test_user.last_name
        assert data["enabled"] is True
        
        email_verified = data.get("email_verified") or data.get("emailVerified")
        assert email_verified is True
    
    @pytest.mark.asyncio
    async def test_get_me_without_token(self, client: AsyncClient):
        """Deve retornar 403 quando não autenticado."""
        response = await client.get("/auth/me")
        
        assert response.status_code == 403


class TestLoginFlow:
    """Testes para POST /auth/login"""
    
    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client: AsyncClient):
        """Deve retornar 401 com credenciais inválidas."""
        from keycloak.exceptions import KeycloakAuthenticationError
        
        with patch('src.routes.auth_routes.keycloak_openid') as mock_keycloak:
            mock_keycloak.token.side_effect = KeycloakAuthenticationError(
                error_message="Invalid user credentials"
            )
            
            response = await client.post(
                "/auth/login",
                json={"username": "wrong@email.com", "password": "wrongpass"}
            )
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_login_account_not_verified(self, client: AsyncClient):
        """Deve retornar 403 quando conta não está verificada."""
        from keycloak.exceptions import KeycloakAuthenticationError
        
        with patch('src.routes.auth_routes.keycloak_openid') as mock_keycloak:
            error = KeycloakAuthenticationError(
                error_message="Account is not fully set up"
            )
            mock_keycloak.token.side_effect = error
            
            response = await client.post(
                "/auth/login",
                json={"username": "unverified@email.com", "password": "password123"}
            )
        
        assert response.status_code == 403
        data = response.json()
        assert data["detail"]["code"] == "ACCOUNT_NOT_VERIFIED"
    
    @pytest.mark.asyncio
    async def test_login_account_disabled(self, client: AsyncClient):
        """Deve retornar 403 quando conta está desativada."""
        from keycloak.exceptions import KeycloakAuthenticationError
        
        with patch('src.routes.auth_routes.keycloak_openid') as mock_keycloak:
            error = KeycloakAuthenticationError(
                error_message="Account disabled"
            )
            mock_keycloak.token.side_effect = error
            
            response = await client.post(
                "/auth/login",
                json={"username": "disabled@email.com", "password": "password123"}
            )
        
        assert response.status_code == 403
        data = response.json()
        assert data["detail"]["code"] == "ACCOUNT_DISABLED"


class TestRegisterFlow:
    """Testes para POST /auth/register"""
    
    @pytest.mark.asyncio
    async def test_register_email_already_exists(self, client: AsyncClient, test_user: User):
        """Deve retornar erro quando email já existe."""
        with patch('src.routes.auth_routes.KeycloakAdmin') as mock_keycloak:
            mock_admin = MagicMock()
            mock_admin.get_users.return_value = [{"id": "existing-user"}]
            mock_keycloak.return_value = mock_admin
            
            response = await client.post(
                "/auth/register",
                json={
                    "email": test_user.email,
                    "username": "newuser",
                    "password": "Password123!",
                    "first_name": "New",
                    "last_name": "User"
                }
            )
        
        assert response.status_code == 400
        assert "Email já cadastrado" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_register_username_already_exists(self, client: AsyncClient, test_user: User):
        """Deve retornar erro quando username já existe."""
        with patch('src.routes.auth_routes.KeycloakAdmin') as mock_keycloak:
            mock_admin = MagicMock()
            
            mock_admin.get_users.side_effect = [[], [{"id": "existing-user"}]]
            mock_keycloak.return_value = mock_admin
            
            response = await client.post(
                "/auth/register",
                json={
                    "email": "newemail@example.com",
                    "username": test_user.username,
                    "password": "Password123!",
                    "first_name": "New",
                    "last_name": "User"
                }
            )
        
        assert response.status_code == 400
        assert "Username já está em uso" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_register_missing_required_fields(self, client: AsyncClient):
        """Deve retornar 422 quando campos obrigatórios estão faltando."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "test@example.com"
                
            }
        )
        
        assert response.status_code == 422


class TestLogoutFlow:
    """Testes para POST /auth/logout"""
    
    @pytest.mark.asyncio
    async def test_logout_success(self, client: AsyncClient):
        """Deve realizar logout com sucesso."""
        with patch('src.routes.auth_routes.keycloak_openid') as mock_keycloak:
            mock_keycloak.logout.return_value = None
            
            response = await client.post(
                "/auth/logout",
                json={"refresh_token": "valid-refresh-token"}
            )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Logout realizado com sucesso"
    
    @pytest.mark.asyncio
    async def test_logout_with_expired_token(self, client: AsyncClient):
        """Deve retornar sucesso mesmo com token já expirado."""
        from keycloak.exceptions import KeycloakPostError
        
        with patch('src.routes.auth_routes.keycloak_openid') as mock_keycloak:
            error = KeycloakPostError(
                error_message="Token expired",
                response_code=400
            )
            mock_keycloak.logout.side_effect = error
            
            response = await client.post(
                "/auth/logout",
                json={"refresh_token": "expired-token"}
            )
        
        assert response.status_code == 200
        assert "já estava inativa" in response.json()["message"]


class TestRefreshToken:
    """Testes para POST /auth/refresh"""
    
    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, client: AsyncClient):
        """Deve retornar erro com refresh token inválido."""
        with patch('src.routes.auth_routes.keycloak_openid') as mock_keycloak:
            mock_keycloak.refresh_token.side_effect = Exception("Invalid refresh token")
            
            response = await client.post(
                "/auth/refresh",
                json={"refresh_token": "invalid-refresh-token"}
            )
        
        assert response.status_code == 401
        assert "inválido ou expirado" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_refresh_token_missing(self, client: AsyncClient):
        """Deve retornar 422 quando refresh_token não é fornecido."""
        response = await client.post(
            "/auth/refresh",
            json={}
        )
        
        assert response.status_code == 422


class TestGoogleAuthUrl:
    """Testes para GET /auth/google/url"""
    
    @pytest.mark.asyncio
    async def test_get_google_auth_url(self, client: AsyncClient):
        """Deve retornar a URL de autenticação do Google."""
        response = await client.get("/auth/google/url")
        
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        assert "kc_idp_hint=google" in data["auth_url"]
