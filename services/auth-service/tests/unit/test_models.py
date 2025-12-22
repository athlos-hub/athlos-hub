"""
Testes Unitários para Models.

Técnica de Teste: Estrutural (Caixa Branca)
- Cobertura de Statements
- Teste de construtores e métodos especiais

Nível: Unitário
Objetivo: Testar a criação e representação dos modelos.
"""
import pytest
import uuid
from datetime import datetime, timezone

from src.models.user import User
from src.models.organization import Organization, OrganizationMember, OrganizationOrganizer
from src.models.enums import MemberStatus, OrganizationStatus, OrganizationPrivacy


class TestUserModel:
    """
    Testes para o modelo User.
    
    Técnica: Cobertura de Statements
    """
    
    def test_user_creation(self):
        """Statement: Cria usuário com todos os campos."""
        # Arrange
        user_id = uuid.uuid4()
        keycloak_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # Act
        user = User(
            id=user_id,
            keycloak_id=keycloak_id,
            email="test@example.com",
            username="testuser",
            first_name="Test",
            last_name="User",
            enabled=True,
            email_verified=True,
            created_at=now,
            updated_at=now,
        )
        
        # Assert
        assert user.id == user_id
        assert user.keycloak_id == keycloak_id
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert user.enabled is True
        assert user.email_verified is True
    
    def test_user_repr(self):
        """Statement: Método __repr__ retorna representação correta."""
        # Arrange
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            keycloak_id=str(uuid.uuid4()),
            email="repr@example.com",
        )
        
        # Act
        repr_str = repr(user)
        
        # Assert
        assert "User" in repr_str
        assert str(user_id) in repr_str
        assert "repr@example.com" in repr_str
    
    def test_user_optional_fields(self):
        """Statement: Campos opcionais podem ser None."""
        # Arrange & Act
        user = User(
            id=uuid.uuid4(),
            keycloak_id=str(uuid.uuid4()),
            email="minimal@example.com",
            username=None,
            first_name=None,
            last_name=None,
            avatar_url=None,
        )
        
        # Assert
        assert user.username is None
        assert user.first_name is None
        assert user.last_name is None
        assert user.avatar_url is None


class TestOrganizationModel:
    """
    Testes para o modelo Organization.
    
    Técnica: Cobertura de Statements + Valores Limite
    """
    
    def test_organization_creation(self):
        """Statement: Cria organização com todos os campos."""
        # Arrange
        org_id = uuid.uuid4()
        owner_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        
        # Act
        org = Organization(
            id=org_id,
            name="Test Organization",
            slug="test-organization",
            description="A test organization",
            owner_id=owner_id,
            privacy=OrganizationPrivacy.PUBLIC,
            status=OrganizationStatus.ACTIVE,
            created_at=now,
            updated_at=now,
        )
        
        # Assert
        assert org.id == org_id
        assert org.name == "Test Organization"
        assert org.slug == "test-organization"
        assert org.description == "A test organization"
        assert org.owner_id == owner_id
        assert org.privacy == OrganizationPrivacy.PUBLIC
        assert org.status == OrganizationStatus.ACTIVE
    
    def test_organization_repr(self):
        """Statement: Método __repr__ retorna representação correta."""
        # Arrange
        org = Organization(
            id=uuid.uuid4(),
            name="Repr Org",
            slug="repr-org",
            owner_id=uuid.uuid4(),
            status=OrganizationStatus.ACTIVE,
        )
        
        # Act
        repr_str = repr(org)
        
        # Assert
        assert "Organization" in repr_str
        assert "repr-org" in repr_str
        assert "ACTIVE" in repr_str
    
    def test_organization_privacy_enum(self):
        """Statement: Testa valores do enum OrganizationPrivacy."""
        # Assert
        assert OrganizationPrivacy.PUBLIC.value == "PUBLIC"
        assert OrganizationPrivacy.PRIVATE.value == "PRIVATE"
    
    def test_organization_status_enum(self):
        """Statement: Testa valores do enum OrganizationStatus."""
        # Assert
        assert OrganizationStatus.PENDING.value == "PENDING"
        assert OrganizationStatus.ACTIVE.value == "ACTIVE"
        assert OrganizationStatus.SUSPENDED.value == "SUSPENDED"


class TestOrganizationMemberModel:
    """
    Testes para o modelo OrganizationMember.
    
    Técnica: Cobertura de Statements
    """
    
    def test_organization_member_creation(self):
        """Statement: Cria membro de organização."""
        # Arrange
        member_id = uuid.uuid4()
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        
        # Act
        member = OrganizationMember(
            id=member_id,
            organization_id=org_id,
            user_id=user_id,
            status=MemberStatus.ACTIVE,
            created_at=now,
            updated_at=now,
        )
        
        # Assert
        assert member.id == member_id
        assert member.organization_id == org_id
        assert member.user_id == user_id
        assert member.status == MemberStatus.ACTIVE
    
    def test_member_status_enum(self):
        """Statement: Testa valores do enum MemberStatus."""
        # Assert
        assert MemberStatus.PENDING.value == "PENDING"
        assert MemberStatus.ACTIVE.value == "ACTIVE"
        assert MemberStatus.INVITED.value == "INVITED"
        assert MemberStatus.BANNED.value == "BANNED"


class TestOrganizationOrganizerModel:
    """
    Testes para o modelo OrganizationOrganizer.
    
    Técnica: Cobertura de Statements
    """
    
    def test_organization_organizer_creation(self):
        """Statement: Cria organizador de organização."""
        # Arrange
        organizer_id = uuid.uuid4()
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        
        # Act
        organizer = OrganizationOrganizer(
            id=organizer_id,
            organization_id=org_id,
            user_id=user_id,
            created_at=now,
        )
        
        # Assert
        assert organizer.id == organizer_id
        assert organizer.organization_id == org_id
        assert organizer.user_id == user_id
