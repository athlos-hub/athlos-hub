"""
Testes Unitários para Exceções Customizadas.

Técnica de Teste: Estrutural (Caixa Branca)
- Cobertura de Statements
- Teste de construtores e valores padrão

Nível: Unitário
Objetivo: Garantir que exceções customizadas funcionam corretamente.
"""
import pytest
from fastapi import status

from src.core.exceptions import UserNotFoundError, OrganizationAlreadyExists


class TestUserNotFoundError:
    """
    Testes para UserNotFoundError.
    
    Técnica: Cobertura de Statements
    """
    
    def test_user_not_found_error_message(self):
        """Statement: Exceção contém identificador na mensagem."""
        # Arrange
        identifier = "user123"
        
        # Act
        error = UserNotFoundError(identifier)
        
        # Assert
        assert identifier in str(error.message)
        assert error.status_code == status.HTTP_404_NOT_FOUND
        assert error.code == "USER_NOT_FOUND"
    
    def test_user_not_found_error_with_uuid(self):
        """Statement: Aceita UUID como identificador."""
        import uuid
        
        # Arrange
        user_id = str(uuid.uuid4())
        
        # Act
        error = UserNotFoundError(user_id)
        
        # Assert
        assert user_id in str(error.message)


class TestOrganizationAlreadyExists:
    """
    Testes para OrganizationAlreadyExists.
    
    Técnica: Cobertura de Branches
    - Branch 1: Com detail
    - Branch 2: Sem detail (mensagem padrão)
    """
    
    def test_organization_already_exists_with_detail(self):
        """Branch: Exceção com detalhe customizado."""
        # Arrange
        detail = "my-organization"
        
        # Act
        error = OrganizationAlreadyExists(detail)
        
        # Assert
        assert detail in str(error.message)
        assert error.status_code == status.HTTP_409_CONFLICT
        assert error.code == "ORGANIZATION_ALREADY_EXISTS"
    
    def test_organization_already_exists_without_detail(self):
        """Branch: Exceção com mensagem padrão."""
        # Act
        error = OrganizationAlreadyExists()
        
        # Assert
        assert "já existe" in str(error.message).lower()
        assert error.status_code == status.HTTP_409_CONFLICT
    
    def test_organization_already_exists_none_detail(self):
        """Branch: Exceção com detail=None."""
        # Act
        error = OrganizationAlreadyExists(detail=None)
        
        # Assert
        assert "nome/slug" in str(error.message).lower()
