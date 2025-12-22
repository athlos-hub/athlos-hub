"""
Testes Unitários para AuthService.

Técnica de Teste: Estrutural (Caixa Branca)
- Cobertura de Statements (Comandos)
- Cobertura de Branches (Decisões)
- Cobertura de Caminhos

Nível: Unitário
Objetivo: Testar métodos isolados do AuthService com mocks das dependências externas.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timezone, timedelta
import uuid

from src.services.auth_service import AuthService
from src.models.user import User


class TestGetPublicKey:
    """
    Testes para AuthService.get_public_key()
    
    Técnica: Cobertura de Branches
    - Branch 1: Cache existe (retorna do cache)
    - Branch 2: Cache não existe (busca do Keycloak)
    - Branch 3: Erro ao buscar chave
    """
    
    @pytest.mark.asyncio
    async def test_get_public_key_from_cache(self):
        """Branch: Deve retornar chave do cache quando disponível."""
        # Arrange
        cached_key = "-----BEGIN PUBLIC KEY-----\nCACHED_KEY\n-----END PUBLIC KEY-----"
        AuthService._public_key_cache = cached_key
        
        try:
            # Act
            result = await AuthService.get_public_key()
            
            # Assert
            assert result == cached_key
        finally:
            # Cleanup
            AuthService._public_key_cache = None
    
    @pytest.mark.asyncio
    async def test_get_public_key_fetch_from_keycloak(self):
        """Branch: Deve buscar chave do Keycloak quando cache está vazio."""
        # Arrange
        AuthService._public_key_cache = None
        mock_key = "MOCKED_PUBLIC_KEY_CONTENT"
        
        with patch('src.services.auth_service.keycloak_openid') as mock_keycloak:
            mock_keycloak.public_key.return_value = mock_key
            
            # Act
            result = await AuthService.get_public_key()
            
            # Assert
            assert "-----BEGIN PUBLIC KEY-----" in result
            assert mock_key in result
            assert "-----END PUBLIC KEY-----" in result
            assert AuthService._public_key_cache is not None
        
        # Cleanup
        AuthService._public_key_cache = None
    
    @pytest.mark.asyncio
    async def test_get_public_key_keycloak_error(self):
        """Branch: Deve lançar exceção quando Keycloak falha."""
        # Arrange
        AuthService._public_key_cache = None
        
        with patch('src.services.auth_service.keycloak_openid') as mock_keycloak:
            mock_keycloak.public_key.side_effect = Exception("Connection refused")
            
            # Act & Assert
            from common.exceptions import AppException
            with pytest.raises(AppException) as exc_info:
                await AuthService.get_public_key()
            
            assert "chave pública" in str(exc_info.value).lower()
        
        # Cleanup
        AuthService._public_key_cache = None


class TestGenerateEmailToken:
    """
    Testes para AuthService.generate_email_token()
    
    Técnica: Cobertura de Statements + Valores Limite
    - Teste com valores padrão
    - Teste com expiração customizada
    """
    
    def test_generate_email_token_default_expiry(self):
        """Statement: Gera token com expiração padrão de 24 horas."""
        # Arrange
        user_id = str(uuid.uuid4())
        
        # Act
        token = AuthService.generate_email_token(user_id)
        
        # Assert
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_generate_email_token_custom_expiry(self):
        """Statement: Gera token com expiração customizada."""
        # Arrange
        user_id = str(uuid.uuid4())
        custom_hours = 48
        
        # Act
        token = AuthService.generate_email_token(user_id, expiry_hours=custom_hours)
        
        # Assert
        assert token is not None
        
        # Verifica que token pode ser decodificado
        from jose import jwt
        from src.config.settings import settings
        
        payload = jwt.decode(token, settings.EMAIL_TOKEN_SECRET, algorithms=["HS256"])
        assert payload["sub"] == user_id
    
    def test_generate_email_token_contains_required_claims(self):
        """Statement: Token contém claims obrigatórios (sub, iat, exp)."""
        # Arrange
        user_id = str(uuid.uuid4())
        
        # Act
        token = AuthService.generate_email_token(user_id)
        
        # Assert
        from jose import jwt
        from src.config.settings import settings
        
        payload = jwt.decode(token, settings.EMAIL_TOKEN_SECRET, algorithms=["HS256"])
        
        assert "sub" in payload
        assert "iat" in payload
        assert "exp" in payload
        assert payload["sub"] == user_id


class TestActivateUser:
    """
    Testes para AuthService.activate_user()
    
    Técnica: Cobertura de Branches (Decision Coverage)
    - Branch 1: Usuário não encontrado
    - Branch 2: Usuário já estava ativo
    - Branch 3: Ativação bem sucedida
    - Branch 4: Erro durante ativação
    """
    
    @pytest.mark.asyncio
    async def test_activate_user_not_found(self):
        """Branch: Retorna erro quando usuário não existe."""
        # Arrange
        user_id = str(uuid.uuid4())
        
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result
        
        with patch('src.services.auth_service.db') as mock_db:
            mock_db.session.return_value.__aenter__.return_value = mock_session
            mock_db.session.return_value.__aexit__.return_value = None
            
            # Act
            result = await AuthService.activate_user(user_id)
            
            # Assert
            assert result["success"] is False
            assert result["error"] == "user_not_found"
    
    @pytest.mark.asyncio
    async def test_activate_user_already_active(self):
        """Branch: Retorna sucesso quando usuário já estava ativo."""
        # Arrange
        user_id = str(uuid.uuid4())
        
        mock_user = MagicMock()
        mock_user.enabled = True
        mock_user.email_verified = True
        
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_session.execute.return_value = mock_result
        
        with patch('src.services.auth_service.db') as mock_db:
            mock_db.session.return_value.__aenter__.return_value = mock_session
            mock_db.session.return_value.__aexit__.return_value = None
            
            # Act
            result = await AuthService.activate_user(user_id)
            
            # Assert
            assert result["success"] is True
            assert result["already_active"] is True
    
    @pytest.mark.asyncio
    async def test_activate_user_success(self):
        """Branch: Ativa usuário com sucesso."""
        # Arrange
        user_id = str(uuid.uuid4())
        
        mock_user = MagicMock()
        mock_user.enabled = False
        mock_user.email_verified = False
        mock_user.email = "test@example.com"
        
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_session.execute.return_value = mock_result
        
        with patch('src.services.auth_service.db') as mock_db, \
             patch('src.services.auth_service.KeycloakAdmin') as mock_keycloak_admin:
            
            mock_db.session.return_value.__aenter__.return_value = mock_session
            mock_db.session.return_value.__aexit__.return_value = None
            
            mock_admin_instance = MagicMock()
            mock_keycloak_admin.return_value = mock_admin_instance
            
            # Act
            result = await AuthService.activate_user(user_id)
            
            # Assert
            assert result["success"] is True
            assert result["user_id"] == user_id
            assert result["email"] == "test@example.com"
            mock_admin_instance.update_user.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_activate_user_exception(self):
        """Branch: Retorna erro quando ocorre exceção."""
        # Arrange
        user_id = str(uuid.uuid4())
        
        with patch('src.services.auth_service.db') as mock_db:
            mock_db.session.return_value.__aenter__.side_effect = Exception("Database error")
            
            # Act
            result = await AuthService.activate_user(user_id)
            
            # Assert
            assert result["success"] is False
            assert "error" in result


class TestGetCurrentUserOptional:
    """
    Testes para AuthService.get_current_user_optional()
    
    Técnica: Cobertura de Branches
    - Branch 1: Sem header Authorization
    - Branch 2: Header não começa com Bearer
    - Branch 3: Token inválido
    - Branch 4: Token válido
    """
    
    @pytest.mark.asyncio
    async def test_get_current_user_optional_no_header(self):
        """Branch: Retorna None quando não há header Authorization."""
        # Arrange
        mock_request = MagicMock()
        mock_request.headers.get.return_value = None
        
        # Act
        result = await AuthService.get_current_user_optional(mock_request)
        
        # Assert
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_current_user_optional_invalid_scheme(self):
        """Branch: Retorna None quando scheme não é Bearer."""
        # Arrange
        mock_request = MagicMock()
        mock_request.headers.get.return_value = "Basic some-token"
        
        # Act
        result = await AuthService.get_current_user_optional(mock_request)
        
        # Assert
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_current_user_optional_invalid_token(self):
        """Branch: Retorna None quando token é inválido."""
        # Arrange
        mock_request = MagicMock()
        mock_request.headers.get.return_value = "Bearer invalid-token"
        
        with patch.object(AuthService, 'get_public_key', new_callable=AsyncMock) as mock_get_key:
            mock_get_key.return_value = "-----BEGIN PUBLIC KEY-----\nKEY\n-----END PUBLIC KEY-----"
            
            with patch('src.services.auth_service.JwtHandler') as mock_jwt:
                mock_jwt.decode_token.side_effect = Exception("Invalid token")
                
                # Act
                result = await AuthService.get_current_user_optional(mock_request)
                
                # Assert
                assert result is None


class TestGetOrCreateUserFromKeycloakToken:
    """
    Testes para AuthService.get_or_create_user_from_keycloak_token()
    
    Técnica: Cobertura de Caminhos (Path Coverage)
    - Caminho 1: Token sem campo 'sub' (erro)
    - Caminho 2: Usuário existente, sem atualizações
    - Caminho 3: Usuário existente, com atualizações
    - Caminho 4: Usuário novo, criação bem sucedida
    - Caminho 5: Usuário por email existe sem keycloak_id (migração)
    - Caminho 6: Conflito de identidade
    - Caminho 7: Race condition na criação
    """
    
    @pytest.mark.asyncio
    async def test_token_without_sub_raises_error(self):
        """Caminho: Token sem 'sub' deve lançar AppException."""
        # Arrange
        token_payload = {"email": "test@example.com"}  # sem 'sub'
        
        # Act & Assert
        from common.exceptions import AppException
        with pytest.raises(AppException) as exc_info:
            await AuthService.get_or_create_user_from_keycloak_token(token_payload)
        
        assert "sub" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_existing_user_no_updates(self):
        """Caminho: Usuário existente sem alterações."""
        # Arrange
        keycloak_id = str(uuid.uuid4())
        
        mock_user = MagicMock()
        mock_user.email = "test@example.com"
        mock_user.username = "testuser"
        mock_user.first_name = "Test"
        mock_user.last_name = "User"
        mock_user.email_verified = True
        mock_user.avatar_url = None
        
        token_payload = {
            "sub": keycloak_id,
            "email": "test@example.com",
            "preferred_username": "testuser",
            "given_name": "Test",
            "family_name": "User",
            "email_verified": True,
        }
        
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_session.execute.return_value = mock_result
        
        with patch('src.services.auth_service.db') as mock_db:
            mock_db.session.return_value.__aenter__.return_value = mock_session
            mock_db.session.return_value.__aexit__.return_value = None
            
            # Act
            result = await AuthService.get_or_create_user_from_keycloak_token(token_payload)
            
            # Assert
            assert result == mock_user
    
    @pytest.mark.asyncio
    async def test_existing_user_with_updates(self):
        """Caminho: Usuário existente com campos a atualizar."""
        # Arrange
        keycloak_id = str(uuid.uuid4())
        
        mock_user = MagicMock()
        mock_user.email = "old@example.com"
        mock_user.username = "olduser"
        mock_user.first_name = "Old"
        mock_user.last_name = "Name"
        mock_user.email_verified = False
        mock_user.avatar_url = None
        
        token_payload = {
            "sub": keycloak_id,
            "email": "new@example.com",
            "preferred_username": "newuser",
            "given_name": "New",
            "family_name": "Name",
            "email_verified": True,
        }
        
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_session.execute.return_value = mock_result
        
        with patch('src.services.auth_service.db') as mock_db:
            mock_db.session.return_value.__aenter__.return_value = mock_session
            mock_db.session.return_value.__aexit__.return_value = None
            
            # Act
            result = await AuthService.get_or_create_user_from_keycloak_token(token_payload)
            
            # Assert
            assert result == mock_user
            mock_session.commit.assert_called()


class TestAddRoleToUser:
    """
    Testes para AuthService.add_role_to_user()
    
    Técnica: Cobertura de Branches
    - Branch 1: Sucesso ao adicionar role
    - Branch 2: Erro ao adicionar role
    """
    
    def test_add_role_success(self):
        """Branch: Adiciona role com sucesso."""
        # Arrange
        user_id = str(uuid.uuid4())
        role_name = "admin"
        
        with patch('src.services.auth_service.KeycloakAdmin') as mock_keycloak:
            mock_admin = MagicMock()
            mock_admin.get_realm_role.return_value = {"name": role_name}
            mock_keycloak.return_value = mock_admin
            
            # Act
            result = AuthService.add_role_to_user(user_id, role_name)
            
            # Assert
            assert result is True
            mock_admin.assign_realm_roles.assert_called_once()
    
    def test_add_role_failure(self):
        """Branch: Lança exceção quando falha ao adicionar role."""
        # Arrange
        user_id = str(uuid.uuid4())
        role_name = "nonexistent_role"
        
        with patch('src.services.auth_service.KeycloakAdmin') as mock_keycloak:
            mock_admin = MagicMock()
            mock_admin.get_realm_role.side_effect = Exception("Role not found")
            mock_keycloak.return_value = mock_admin
            
            # Act & Assert
            from common.exceptions import AppException
            with pytest.raises(AppException) as exc_info:
                AuthService.add_role_to_user(user_id, role_name)
            
            assert role_name in str(exc_info.value)
