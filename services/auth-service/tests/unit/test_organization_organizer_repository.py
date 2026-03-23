"""Unit tests for organization organizer repository."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from auth_service.repositories.organization_organizer_repository import (
    OrganizationOrganizerRepository,
)
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationOrganizer,
)


class TestOrganizationOrganizerRepository:
    """Tests for OrganizationOrganizerRepository."""

    @pytest.fixture
    def mock_session(self):
        """Create a mock async session."""
        session = AsyncMock()
        session.get = AsyncMock()
        session.execute = AsyncMock()
        session.scalar = AsyncMock()
        session.scalars = AsyncMock()
        session.add = MagicMock()
        session.delete = AsyncMock()
        session.flush = AsyncMock()
        session.refresh = AsyncMock()
        session.commit = AsyncMock()
        return session

    @pytest.fixture
    def repository(self, mock_session):
        """Create a repository instance."""
        return OrganizationOrganizerRepository(mock_session)

    @pytest.fixture
    def sample_organizer(self):
        """Create a sample organizer."""
        return OrganizationOrganizer(
            id=uuid4(),
            organization_id=uuid4(),
            user_id=uuid4(),
            created_at=datetime.now(),
        )

    @pytest.fixture
    def sample_organization(self):
        """Create a sample organization."""
        return Organization(
            id=uuid4(),
            name="Test Org",
            slug="test-org",
            description="Test",
            owner_id=uuid4(),
            privacy="PUBLIC",
            join_policy="REQUEST_ONLY",
            status="ACTIVE",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

    @pytest.mark.asyncio
    async def test_get_organizer_found(self, repository, mock_session, sample_organizer):
        """Test get_organizer when organizer exists."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_organizer
        mock_session.execute.return_value = mock_result

        result = await repository.get_organizer(
            sample_organizer.organization_id, sample_organizer.user_id
        )

        assert result == sample_organizer

    @pytest.mark.asyncio
    async def test_get_organizer_not_found(self, repository, mock_session):
        """Test get_organizer when organizer doesn't exist."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await repository.get_organizer(uuid4(), uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_is_organizer_true(self, repository, mock_session):
        """Test is_organizer when user is an organizer."""
        mock_session.scalar.return_value = uuid4()  # Returns ID when exists

        result = await repository.is_organizer(uuid4(), uuid4())

        assert result is True

    @pytest.mark.asyncio
    async def test_is_organizer_false(self, repository, mock_session):
        """Test is_organizer when user is not an organizer."""
        mock_session.scalar.return_value = None

        result = await repository.is_organizer(uuid4(), uuid4())

        assert result is False

    @pytest.mark.asyncio
    async def test_is_owner_or_organizer_owner(self, repository, mock_session, sample_organization):
        """Test is_owner_or_organizer when user is owner."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_organization
        mock_session.execute.return_value = mock_result

        result = await repository.is_owner_or_organizer(
            sample_organization.slug, sample_organization.owner_id
        )

        assert result == sample_organization

    @pytest.mark.asyncio
    async def test_is_owner_or_organizer_not_found(self, repository, mock_session):
        """Test is_owner_or_organizer when user has no access."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await repository.is_owner_or_organizer("test-slug", uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_get_organizers_by_org(self, repository, mock_session, sample_organizer):
        """Test get_organizers_by_org returns organizers."""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [sample_organizer]
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_organizers_by_org(sample_organizer.organization_id)

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_create_organizer(self, repository, mock_session, sample_organizer):
        """Test create adds organizer to session."""
        result = await repository.create(sample_organizer)

        assert result == sample_organizer
        mock_session.add.assert_called_once_with(sample_organizer)
        mock_session.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_organizer(self, repository, mock_session, sample_organizer):
        """Test delete removes organizer from session."""
        await repository.delete(sample_organizer)

        mock_session.delete.assert_called_once_with(sample_organizer)
        mock_session.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_commit(self, repository, mock_session):
        """Test commit transaction."""
        await repository.commit()

        mock_session.commit.assert_awaited_once()
