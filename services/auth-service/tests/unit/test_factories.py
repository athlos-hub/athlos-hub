"""
Testes Unitários para Factories.

Técnica de Teste: Estrutural (Caixa Branca)
- Cobertura de Statements
- Cobertura de Branches

Nível: Unitário
Objetivo: Testar que as factories criam objetos corretamente.
"""
import pytest
import uuid

from tests.factories import UserFactory, OrganizationFactory, OrganizationMemberFactory
from src.models.user import User
from src.models.organization import Organization, OrganizationMember
from src.models.enums import MemberStatus, OrganizationPrivacy, OrganizationStatus


class TestUserFactory:
    """
    Testes para UserFactory.
    
    Técnica: Cobertura de Statements + Branches
    """
    
    def test_build_user_default(self):
        """Statement: Build cria User com valores padrão."""
        # Act
        user = UserFactory.build()
        
        # Assert
        assert user.id is not None
        assert user.keycloak_id is not None
        assert user.email is not None
        assert user.username is not None
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert user.enabled is True
        assert user.email_verified is True
    
    def test_build_user_custom_values(self):
        """Statement: Build aceita valores customizados."""
        # Arrange
        custom_id = uuid.uuid4()
        custom_keycloak = "custom-keycloak-id"
        
        # Act
        user = UserFactory.build(
            id=custom_id,
            keycloak_id=custom_keycloak,
            email="custom@example.com",
            username="customuser",
            first_name="Custom",
            last_name="Name",
            enabled=False,
            email_verified=False,
        )
        
        # Assert
        assert user.id == custom_id
        assert user.keycloak_id == custom_keycloak
        assert user.email == "custom@example.com"
        assert user.username == "customuser"
        assert user.first_name == "Custom"
        assert user.last_name == "Name"
        assert user.enabled is False
        assert user.email_verified is False
    
    def test_build_user_counter_increments(self):
        """Statement: Counter incrementa para emails/usernames únicos."""
        # Reset counter
        UserFactory._counter = 0
        
        # Act
        user1 = UserFactory.build()
        user2 = UserFactory.build()
        user3 = UserFactory.build()
        
        # Assert
        assert user1.email != user2.email != user3.email
        assert user1.username != user2.username != user3.username
    
    def test_build_user_with_avatar(self):
        """Statement: Build aceita avatar_url."""
        # Act
        user = UserFactory.build(avatar_url="https://example.com/avatar.jpg")
        
        # Assert
        assert user.avatar_url == "https://example.com/avatar.jpg"
    
    def test_build_returns_user_instance(self):
        """Statement: Build retorna instância de User."""
        # Act
        user = UserFactory.build()
        
        # Assert
        assert isinstance(user, User)


class TestOrganizationFactory:
    """
    Testes para OrganizationFactory.
    
    Técnica: Cobertura de Statements + Branches
    """
    
    def test_build_organization_default(self):
        """Statement: Build cria Organization com valores padrão."""
        # Arrange
        owner_id = uuid.uuid4()
        
        # Act
        org = OrganizationFactory.build(owner_id=owner_id)
        
        # Assert
        assert org.id is not None
        assert org.name is not None
        assert org.slug is not None
        assert org.owner_id == owner_id
        assert org.privacy == OrganizationPrivacy.PUBLIC
        assert org.status == OrganizationStatus.ACTIVE
    
    def test_build_organization_custom_values(self):
        """Statement: Build aceita valores customizados."""
        # Arrange
        org_id = uuid.uuid4()
        owner_id = uuid.uuid4()
        
        # Act
        org = OrganizationFactory.build(
            id=org_id,
            owner_id=owner_id,
            name="Custom Organization",
            slug="custom-org",
            description="Custom description",
            privacy=OrganizationPrivacy.PRIVATE,
            status=OrganizationStatus.PENDING,
        )
        
        # Assert
        assert org.id == org_id
        assert org.name == "Custom Organization"
        assert org.slug == "custom-org"
        assert org.description == "Custom description"
        assert org.privacy == OrganizationPrivacy.PRIVATE
        assert org.status == OrganizationStatus.PENDING
    
    def test_build_organization_counter_increments(self):
        """Statement: Counter incrementa para nomes/slugs únicos."""
        # Reset counter
        OrganizationFactory._counter = 0
        owner_id = uuid.uuid4()
        
        # Act
        org1 = OrganizationFactory.build(owner_id=owner_id)
        org2 = OrganizationFactory.build(owner_id=owner_id)
        
        # Assert
        assert org1.name != org2.name
        assert org1.slug != org2.slug
    
    def test_build_returns_organization_instance(self):
        """Statement: Build retorna instância de Organization."""
        # Act
        org = OrganizationFactory.build(owner_id=uuid.uuid4())
        
        # Assert
        assert isinstance(org, Organization)


class TestOrganizationMemberFactory:
    """
    Testes para OrganizationMemberFactory.
    
    Técnica: Cobertura de Statements + Branches
    """
    
    def test_build_member_default(self):
        """Statement: Build cria OrganizationMember com valores padrão."""
        # Arrange
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        
        # Act
        member = OrganizationMemberFactory.build(
            organization_id=org_id,
            user_id=user_id
        )
        
        # Assert
        assert member.id is not None
        assert member.organization_id == org_id
        assert member.user_id == user_id
        assert member.status == MemberStatus.PENDING
    
    def test_build_member_custom_status(self):
        """Statement: Build aceita status customizado."""
        # Arrange
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        
        # Act
        member = OrganizationMemberFactory.build(
            organization_id=org_id,
            user_id=user_id,
            status=MemberStatus.ACTIVE
        )
        
        # Assert
        assert member.status == MemberStatus.ACTIVE
    
    def test_build_member_custom_id(self):
        """Statement: Build aceita ID customizado."""
        # Arrange
        member_id = uuid.uuid4()
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        
        # Act
        member = OrganizationMemberFactory.build(
            id=member_id,
            organization_id=org_id,
            user_id=user_id
        )
        
        # Assert
        assert member.id == member_id
    
    def test_build_returns_organization_member_instance(self):
        """Statement: Build retorna instância de OrganizationMember."""
        # Act
        member = OrganizationMemberFactory.build(
            organization_id=uuid.uuid4(),
            user_id=uuid.uuid4()
        )
        
        # Assert
        assert isinstance(member, OrganizationMember)
