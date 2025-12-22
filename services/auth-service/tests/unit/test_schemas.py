"""
Testes Unitários para Schemas (Pydantic).

Técnica de Teste: Estrutural (Caixa Branca)
- Cobertura de Statements
- Teste de Validação de Entrada
- Valores Limite

Nível: Unitário
Objetivo: Testar validação de schemas Pydantic.
"""
import pytest
from pydantic import ValidationError
from uuid import uuid4
from datetime import datetime, timezone

from src.schemas.organization import (
    OrganizationBase,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationWithRole,
)
from src.schemas.user import UserPublic, UserOrgMember, UserAdmin
from src.models.enums import OrganizationPrivacy, OrganizationStatus


class TestOrganizationSchemas:
    """
    Testes para schemas de Organization.
    
    Técnica: Cobertura de Statements + Valores Limite + Partição de Equivalência
    """
    
    def test_organization_base_valid(self):
        """Statement: Cria OrganizationBase com dados válidos."""
        # Arrange & Act
        org = OrganizationBase(
            name="Valid Organization",
            description="A valid description",
            privacy=OrganizationPrivacy.PUBLIC
        )
        
        # Assert
        assert org.name == "Valid Organization"
        assert org.description == "A valid description"
        assert org.privacy == OrganizationPrivacy.PUBLIC
    
    def test_organization_base_name_min_length(self):
        """Valor Limite: Nome com exatamente 3 caracteres (mínimo)."""
        # Arrange & Act
        org = OrganizationBase(name="ABC")
        
        # Assert
        assert org.name == "ABC"
    
    def test_organization_base_name_too_short(self):
        """Valor Limite: Nome com menos de 3 caracteres deve falhar."""
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            OrganizationBase(name="AB")
        
        assert "min_length" in str(exc_info.value).lower() or "String should have at least" in str(exc_info.value)
    
    def test_organization_base_name_max_length(self):
        """Valor Limite: Nome com 255 caracteres (máximo)."""
        # Arrange
        long_name = "A" * 255
        
        # Act
        org = OrganizationBase(name=long_name)
        
        # Assert
        assert len(org.name) == 255
    
    def test_organization_base_name_too_long(self):
        """Valor Limite: Nome com mais de 255 caracteres deve falhar."""
        # Arrange
        too_long_name = "A" * 256
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            OrganizationBase(name=too_long_name)
        
        assert "max_length" in str(exc_info.value).lower() or "String should have at most" in str(exc_info.value)
    
    def test_organization_base_default_privacy(self):
        """Statement: Privacy padrão é PUBLIC."""
        # Act
        org = OrganizationBase(name="Test Org")
        
        # Assert
        assert org.privacy == OrganizationPrivacy.PUBLIC
    
    def test_organization_base_private(self):
        """Statement: Privacy PRIVATE."""
        # Act
        org = OrganizationBase(name="Private Org", privacy=OrganizationPrivacy.PRIVATE)
        
        # Assert
        assert org.privacy == OrganizationPrivacy.PRIVATE
    
    def test_organization_create_inherits_base(self):
        """Statement: OrganizationCreate herda de OrganizationBase."""
        # Act
        org = OrganizationCreate(name="New Org")
        
        # Assert
        assert isinstance(org, OrganizationBase)
    
    def test_organization_response_complete(self):
        """Statement: OrganizationResponse com todos os campos."""
        # Arrange
        now = datetime.now(timezone.utc)
        
        # Act
        org = OrganizationResponse(
            id=uuid4(),
            name="Response Org",
            slug="response-org",
            owner_id=uuid4(),
            status=OrganizationStatus.ACTIVE,
            created_at=now,
            updated_at=now,
        )
        
        # Assert
        assert org.slug == "response-org"
        assert org.status == OrganizationStatus.ACTIVE
    
    def test_organization_with_role(self):
        """Statement: OrganizationWithRole inclui campo role."""
        # Act
        org = OrganizationWithRole(
            id=uuid4(),
            name="Role Org",
            slug="role-org",
            owner_id=uuid4(),
            role="OWNER"
        )
        
        # Assert
        assert org.role == "OWNER"


class TestUserSchemas:
    """
    Testes para schemas de User.
    
    Técnica: Cobertura de Statements + Partição de Equivalência
    """
    
    def test_user_public_valid(self):
        """Statement: UserPublic com dados válidos."""
        # Act
        user = UserPublic(
            id=uuid4(),
            username="testuser",
            first_name="Test",
            last_name="User"
        )
        
        # Assert
        assert user.username == "testuser"
        assert user.first_name == "Test"
        assert user.last_name == "User"
    
    def test_user_public_optional_names(self):
        """Statement: first_name e last_name são opcionais."""
        # Act
        user = UserPublic(
            id=uuid4(),
            username="minimal"
        )
        
        # Assert
        assert user.first_name is None
        assert user.last_name is None
    
    def test_user_org_member_with_email(self):
        """Statement: UserOrgMember inclui email."""
        # Act
        user = UserOrgMember(
            id=uuid4(),
            username="member",
            email="member@example.com"
        )
        
        # Assert
        assert user.email == "member@example.com"
    
    def test_user_org_member_invalid_email(self):
        """Partição: Email inválido deve falhar."""
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            UserOrgMember(
                id=uuid4(),
                username="invalid",
                email="not-an-email"
            )
        
        assert "email" in str(exc_info.value).lower()
    
    def test_user_admin_complete(self):
        """Statement: UserAdmin com todos os campos."""
        # Arrange
        now = datetime.now(timezone.utc)
        
        # Act
        user = UserAdmin(
            id=uuid4(),
            username="admin",
            email="admin@example.com",
            keycloak_id="keycloak-123",
            enabled=True,
            email_verified=True,
            created_at=now,
            updated_at=now
        )
        
        # Assert
        assert user.keycloak_id == "keycloak-123"
        assert user.enabled is True
        assert user.email_verified is True
    
    def test_user_admin_inheritance(self):
        """Statement: UserAdmin herda de UserOrgMember."""
        # Arrange
        now = datetime.now(timezone.utc)
        
        # Act
        user = UserAdmin(
            id=uuid4(),
            username="admin",
            email="admin@example.com",
            keycloak_id="keycloak-456",
            enabled=False,
            email_verified=False,
            created_at=now,
            updated_at=now
        )
        
        # Assert
        assert isinstance(user, UserOrgMember)
        assert isinstance(user, UserPublic)
