"""Unit tests for repositories."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from auth_service.infrastructure.repositories.user_repository import UserRepository
from auth_service.infrastructure.repositories.organization_repository import OrganizationRepository
from auth_service.infrastructure.database.models.user_model import User
from auth_service.infrastructure.database.models.organization_model import Organization


class TestUserRepository:
    """Tests for UserRepository."""

    @pytest.fixture
    def mock_session(self):
        """Create a mock async session."""
        session = AsyncMock()
        session.get = AsyncMock()
        session.execute = AsyncMock()
        session.scalars = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.refresh = AsyncMock()
        session.commit = AsyncMock()
        session.rollback = AsyncMock()
        return session

    @pytest.fixture
    def repository(self, mock_session):
        """Create a repository instance."""
        return UserRepository(mock_session)

    @pytest.fixture
    def sample_user(self):
        """Create a sample user."""
        return User(
            id=uuid4(),
            keycloak_id="keycloak-123",
            email="test@example.com",
            username="testuser",
            first_name="Test",
            last_name="User",
            enabled=True,
            email_verified=True,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

    @pytest.mark.asyncio
    async def test_get_by_id_found(self, repository, mock_session, sample_user):
        """Test get_by_id when user is found."""
        mock_session.get.return_value = sample_user

        result = await repository.get_by_id(sample_user.id)

        assert result == sample_user
        mock_session.get.assert_called_once_with(User, sample_user.id)

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self, repository, mock_session):
        """Test get_by_id when user is not found."""
        mock_session.get.return_value = None

        result = await repository.get_by_id(uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_email_found(self, repository, mock_session, sample_user):
        """Test get_by_email when user is found."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_session.execute.return_value = mock_result

        result = await repository.get_by_email(sample_user.email)

        assert result == sample_user

    @pytest.mark.asyncio
    async def test_get_by_email_not_found(self, repository, mock_session):
        """Test get_by_email when user is not found."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await repository.get_by_email("notfound@example.com")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_keycloak_id_found(self, repository, mock_session, sample_user):
        """Test get_by_keycloak_id when user is found."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_session.execute.return_value = mock_result

        result = await repository.get_by_keycloak_id(sample_user.keycloak_id)

        assert result == sample_user

    @pytest.mark.asyncio
    async def test_get_by_keycloak_id_not_found(self, repository, mock_session):
        """Test get_by_keycloak_id when user is not found."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await repository.get_by_keycloak_id("nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_all_enabled(self, repository, mock_session, sample_user):
        """Test get_all_enabled returns enabled users."""
        mock_result = MagicMock()
        mock_result.all.return_value = [sample_user]
        mock_session.scalars.return_value = mock_result

        result = await repository.get_all_enabled()

        assert len(result) == 1
        assert result[0] == sample_user

    @pytest.mark.asyncio
    async def test_get_all(self, repository, mock_session, sample_user):
        """Test get_all returns all users."""
        mock_result = MagicMock()
        mock_result.all.return_value = [sample_user]
        mock_session.scalars.return_value = mock_result

        result = await repository.get_all()

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_create_user(self, repository, mock_session, sample_user):
        """Test create adds user to session."""
        result = await repository.create(sample_user)

        assert result == sample_user
        mock_session.add.assert_called_once_with(sample_user)
        mock_session.flush.assert_called_once()
        mock_session.refresh.assert_called_once_with(sample_user)

    @pytest.mark.asyncio
    async def test_update_user(self, repository, mock_session, sample_user):
        """Test update user by ID."""
        mock_session.get.return_value = sample_user

        result = await repository.update(sample_user.id, {"first_name": "Updated"})

        assert result == sample_user
        mock_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_user_empty_data(self, repository, mock_session, sample_user):
        """Test update with empty data returns existing user."""
        mock_session.get.return_value = sample_user

        result = await repository.update(sample_user.id, {})

        assert result == sample_user
        mock_session.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_suspend_user_success(self, repository, mock_session, sample_user):
        """Test suspend user when enabled."""
        mock_session.get.return_value = sample_user

        result = await repository.suspend(sample_user.id)

        assert result == sample_user
        assert sample_user.enabled is False
        mock_session.flush.assert_called()

    @pytest.mark.asyncio
    async def test_suspend_user_not_found(self, repository, mock_session):
        """Test suspend user when not found."""
        mock_session.get.return_value = None

        result = await repository.suspend(uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_suspend_user_already_disabled(self, repository, mock_session, sample_user):
        """Test suspend user when already disabled."""
        sample_user.enabled = False
        mock_session.get.return_value = sample_user

        result = await repository.suspend(sample_user.id)

        assert result == sample_user
        assert sample_user.enabled is False

    @pytest.mark.asyncio
    async def test_save_user(self, repository, mock_session, sample_user):
        """Test save user."""
        result = await repository.save(sample_user)

        assert result == sample_user
        mock_session.add.assert_called_once_with(sample_user)
        mock_session.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_commit(self, repository, mock_session):
        """Test commit transaction."""
        await repository.commit()

        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_rollback(self, repository, mock_session):
        """Test rollback transaction."""
        await repository.rollback()

        mock_session.rollback.assert_called_once()


class TestOrganizationRepository:
    """Tests for OrganizationRepository."""

    @pytest.fixture
    def mock_session(self):
        """Create a mock async session."""
        session = AsyncMock()
        session.get = AsyncMock()
        session.execute = AsyncMock()
        session.scalar = AsyncMock()
        session.scalars = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.refresh = AsyncMock()
        session.commit = AsyncMock()
        return session

    @pytest.fixture
    def repository(self, mock_session):
        """Create a repository instance."""
        return OrganizationRepository(mock_session)

    @pytest.fixture
    def sample_organization(self):
        """Create a sample organization."""
        return Organization(
            id=uuid4(),
            name="Test Org",
            slug="test-org",
            description="Test organization",
            owner_id=uuid4(),
            privacy="PUBLIC",
            join_policy="REQUEST_ONLY",
            status="ACTIVE",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

    @pytest.mark.asyncio
    async def test_get_by_id_found(self, repository, mock_session, sample_organization):
        """Test get_by_id when organization is found."""
        mock_session.get.return_value = sample_organization

        result = await repository.get_by_id(sample_organization.id)

        assert result == sample_organization
        mock_session.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self, repository, mock_session):
        """Test get_by_id when organization is not found."""
        mock_session.get.return_value = None

        result = await repository.get_by_id(uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_slug_found(self, repository, mock_session, sample_organization):
        """Test get_by_slug when organization is found."""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.first.return_value = sample_organization
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_by_slug(sample_organization.slug)

        assert result == sample_organization

    @pytest.mark.asyncio
    async def test_get_by_slug_not_found(self, repository, mock_session):
        """Test get_by_slug when organization is not found."""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.first.return_value = None
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_by_slug("nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_exists_by_slug_true(self, repository, mock_session):
        """Test exists_by_slug when organization exists."""
        mock_session.scalar.return_value = uuid4()  # Returns an ID when exists

        result = await repository.exists_by_slug("test-slug")

        assert result is True

    @pytest.mark.asyncio
    async def test_exists_by_slug_false(self, repository, mock_session):
        """Test exists_by_slug when organization doesn't exist."""
        mock_session.scalar.return_value = None  # Returns None when not found

        result = await repository.exists_by_slug("nonexistent")

        assert result is False  # result is not None returns False when None

    @pytest.mark.asyncio
    async def test_get_all_public(self, repository, mock_session, sample_organization):
        """Test get_all returns public organizations."""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [sample_organization]
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_all()

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_create_organization(self, repository, mock_session, sample_organization):
        """Test create adds organization to session."""
        result = await repository.create(sample_organization)

        assert result == sample_organization
        mock_session.add.assert_called_once_with(sample_organization)
        mock_session.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_commit(self, repository, mock_session):
        """Test commit transaction."""
        await repository.commit()

        mock_session.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_rollback(self, repository, mock_session):
        """Test rollback transaction."""
        await repository.rollback()

        mock_session.rollback.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_by_slug_with_owner(self, repository, mock_session, sample_organization):
        """Test get_by_slug_with_owner returns organization with owner loaded."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_organization
        mock_session.execute.return_value = mock_result

        result = await repository.get_by_slug_with_owner(sample_organization.slug)

        assert result == sample_organization

    @pytest.mark.asyncio
    async def test_get_by_slug_with_owner_not_found(self, repository, mock_session):
        """Test get_by_slug_with_owner when organization not found."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await repository.get_by_slug_with_owner("nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_all_with_privacy_filter(self, repository, mock_session, sample_organization):
        """Test get_all with privacy filter."""
        from auth_service.infrastructure.database.models.enums import OrganizationPrivacy

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [sample_organization]
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_all(privacy=OrganizationPrivacy.PUBLIC)

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_all_with_pagination(self, repository, mock_session, sample_organization):
        """Test get_all with limit and offset."""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [sample_organization]
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_all(limit=10, offset=5)

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_all_admin(self, repository, mock_session, sample_organization):
        """Test get_all_admin returns all organizations."""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [sample_organization]
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_all_admin()

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_all_admin_with_status_filter(self, repository, mock_session, sample_organization):
        """Test get_all_admin with status filter."""
        from auth_service.infrastructure.database.models.enums import OrganizationStatus

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [sample_organization]
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_all_admin(status_filter=OrganizationStatus.ACTIVE)

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_update_organization(self, repository, mock_session, sample_organization):
        """Test update organization."""
        mock_session.get.return_value = sample_organization

        result = await repository.update(sample_organization.id, {"name": "Updated Org"})

        assert result == sample_organization
        mock_session.execute.assert_awaited_once()
        mock_session.flush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_organization_empty_data(self, repository, mock_session, sample_organization):
        """Test update organization with empty data returns existing."""
        mock_session.get.return_value = sample_organization

        result = await repository.update(sample_organization.id, {})

        assert result == sample_organization
        mock_session.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_organization_not_found(self, repository, mock_session):
        """Test update organization when not found."""
        mock_session.get.return_value = None

        result = await repository.update(uuid4(), {"name": "Test"})

        assert result is None

    @pytest.mark.asyncio
    async def test_delete_organization(self, repository, mock_session, sample_organization):
        """Test delete organization."""
        mock_session.get.return_value = sample_organization

        result = await repository.delete(sample_organization.id)

        assert result is True
        mock_session.delete.assert_awaited_once_with(sample_organization)

    @pytest.mark.asyncio
    async def test_delete_organization_not_found(self, repository, mock_session):
        """Test delete organization when not found."""
        mock_session.get.return_value = None

        result = await repository.delete(uuid4())

        assert result is False
        mock_session.delete.assert_not_called()

    @pytest.mark.asyncio
    async def test_save_organization(self, repository, mock_session, sample_organization):
        """Test save organization."""
        result = await repository.save(sample_organization)

        assert result == sample_organization
        mock_session.add.assert_called_once_with(sample_organization)
        mock_session.flush.assert_awaited_once()
