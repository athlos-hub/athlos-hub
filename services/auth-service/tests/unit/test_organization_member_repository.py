"""Unit tests for organization member repository."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from auth_service.repositories.organization_member_repository import (
    OrganizationMemberRepository,
    OrgRole,
)
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationMember,
)
from auth_service.infrastructure.database.models.enums import MemberStatus


class TestOrganizationMemberRepository:
    """Tests for OrganizationMemberRepository."""

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
        session.rollback = AsyncMock()
        return session

    @pytest.fixture
    def repository(self, mock_session):
        """Create a repository instance."""
        return OrganizationMemberRepository(mock_session)

    @pytest.fixture
    def sample_membership(self):
        """Create a sample membership."""
        return OrganizationMember(
            id=uuid4(),
            organization_id=uuid4(),
            user_id=uuid4(),
            status=MemberStatus.ACTIVE,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

    @pytest.mark.asyncio
    async def test_get_membership_found(self, repository, mock_session, sample_membership):
        """Test get_membership when membership exists."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_membership
        mock_session.execute.return_value = mock_result

        result = await repository.get_membership(
            sample_membership.organization_id, sample_membership.user_id
        )

        assert result == sample_membership

    @pytest.mark.asyncio
    async def test_get_membership_not_found(self, repository, mock_session):
        """Test get_membership when membership doesn't exist."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await repository.get_membership(uuid4(), uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_exists_membership_true(self, repository, mock_session):
        """Test exists_membership when membership exists."""
        mock_session.scalar.return_value = uuid4()  # Returns ID when exists

        result = await repository.exists_membership(
            uuid4(), uuid4(), [MemberStatus.ACTIVE]
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_exists_membership_false(self, repository, mock_session):
        """Test exists_membership when membership doesn't exist."""
        mock_session.scalar.return_value = None

        result = await repository.exists_membership(
            uuid4(), uuid4(), [MemberStatus.ACTIVE]
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_get_membership_by_status_found(self, repository, mock_session, sample_membership):
        """Test get_membership_by_status when membership exists."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_membership
        mock_session.execute.return_value = mock_result

        result = await repository.get_membership_by_status(
            sample_membership.organization_id,
            sample_membership.user_id,
            MemberStatus.ACTIVE,
        )

        assert result == sample_membership

    @pytest.mark.asyncio
    async def test_get_membership_by_status_not_found(self, repository, mock_session):
        """Test get_membership_by_status when membership doesn't exist."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await repository.get_membership_by_status(
            uuid4(), uuid4(), MemberStatus.ACTIVE
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_create_membership(self, repository, mock_session, sample_membership):
        """Test create adds membership to session."""
        result = await repository.create(sample_membership)

        assert result == sample_membership
        mock_session.add.assert_called_once_with(sample_membership)
        mock_session.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_membership(self, repository, mock_session, sample_membership):
        """Test delete removes membership from session."""
        await repository.delete(sample_membership)

        mock_session.delete.assert_called_once_with(sample_membership)
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
    async def test_get_pending_requests(self, repository, mock_session, sample_membership):
        """Test get_pending_requests returns pending members."""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [sample_membership]
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_pending_requests(sample_membership.organization_id)

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_sent_invites(self, repository, mock_session, sample_membership):
        """Test get_sent_invites returns invited members."""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [sample_membership]
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_sent_invites(sample_membership.organization_id)

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_user_invites(self, repository, mock_session, sample_membership):
        """Test get_user_invites returns user invites."""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [sample_membership]
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_user_invites(sample_membership.user_id)

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_user_requests(self, repository, mock_session, sample_membership):
        """Test get_user_requests returns user pending requests."""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [sample_membership]
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        result = await repository.get_user_requests(sample_membership.user_id)

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_update_status(self, repository, mock_session, sample_membership):
        """Test update_status updates membership status."""
        from auth_service.infrastructure.database.models.enums import MemberStatus

        result = await repository.update_status(sample_membership, MemberStatus.ACTIVE)

        assert result.status == MemberStatus.ACTIVE
        mock_session.flush.assert_awaited()
        mock_session.refresh.assert_awaited_with(sample_membership)

    @pytest.mark.asyncio
    async def test_get_user_organizations_with_role_empty_filters(self, repository, mock_session):
        """Test get_user_organizations_with_role with empty roles."""
        from uuid import uuid4

        result = await repository.get_user_organizations_with_role(uuid4(), set())

        assert result == []

    @pytest.mark.asyncio
    async def test_get_user_organizations_with_role_owner(self, repository, mock_session):
        """Test get_user_organizations_with_role with owner role."""
        from uuid import uuid4
        from auth_service.repositories.organization_member_repository import OrgRole

        mock_result = MagicMock()
        mock_result.all.return_value = []
        mock_session.execute.return_value = mock_result

        result = await repository.get_user_organizations_with_role(uuid4(), {OrgRole.OWNER})

        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_pending_membership_for_approval_not_found(self, repository, mock_session):
        """Test get_pending_membership_for_approval when membership not found."""
        from uuid import uuid4

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await repository.get_pending_membership_for_approval(
            uuid4(), "test-slug", uuid4()
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_get_pending_membership_for_approval_org_not_found(
        self, repository, mock_session, sample_membership
    ):
        """Test get_pending_membership_for_approval when organization not found."""
        from uuid import uuid4

        # First call returns membership
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = sample_membership
        # Second call returns None (org not found)
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = None

        mock_session.execute.side_effect = [mock_result1, mock_result2]

        result = await repository.get_pending_membership_for_approval(
            sample_membership.id, "wrong-slug", uuid4()
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_get_pending_membership_for_approval_not_pending(
        self, repository, mock_session
    ):
        """Test get_pending_membership_for_approval when status is not PENDING."""
        from uuid import uuid4
        from datetime import datetime
        from auth_service.infrastructure.database.models.organization_model import (
            OrganizationMember,
            Organization,
        )
        from auth_service.infrastructure.database.models.enums import MemberStatus

        org_id = uuid4()
        owner_id = uuid4()
        
        # Member with ACTIVE status
        member = OrganizationMember(
            id=uuid4(),
            organization_id=org_id,
            user_id=uuid4(),
            status=MemberStatus.ACTIVE,
            created_at=datetime.now(),
        )
        
        org = Organization(
            id=org_id,
            name="Test Org",
            slug="test-slug",
            description="Test",
            owner_id=owner_id,
            privacy="PUBLIC",
            join_policy="REQUEST_ONLY",
            status="ACTIVE",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = member
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = org

        mock_session.execute.side_effect = [mock_result1, mock_result2]

        result = await repository.get_pending_membership_for_approval(
            member.id, "test-slug", owner_id
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_get_pending_membership_for_approval_owner_success(
        self, repository, mock_session
    ):
        """Test get_pending_membership_for_approval when approver is owner."""
        from uuid import uuid4
        from datetime import datetime
        from auth_service.infrastructure.database.models.organization_model import (
            OrganizationMember,
            Organization,
        )
        from auth_service.infrastructure.database.models.enums import MemberStatus

        org_id = uuid4()
        owner_id = uuid4()
        
        # Member with PENDING status
        member = OrganizationMember(
            id=uuid4(),
            organization_id=org_id,
            user_id=uuid4(),
            status=MemberStatus.PENDING,
            created_at=datetime.now(),
        )
        
        org = Organization(
            id=org_id,
            name="Test Org",
            slug="test-slug",
            description="Test",
            owner_id=owner_id,
            privacy="PUBLIC",
            join_policy="REQUEST_ONLY",
            status="ACTIVE",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = member
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = org

        mock_session.execute.side_effect = [mock_result1, mock_result2]

        result = await repository.get_pending_membership_for_approval(
            member.id, "test-slug", owner_id
        )

        assert result == member

    @pytest.mark.asyncio
    async def test_get_pending_membership_for_approval_organizer_success(
        self, repository, mock_session
    ):
        """Test get_pending_membership_for_approval when approver is organizer."""
        from uuid import uuid4
        from datetime import datetime
        from auth_service.infrastructure.database.models.organization_model import (
            OrganizationMember,
            Organization,
            OrganizationOrganizer,
        )
        from auth_service.infrastructure.database.models.enums import MemberStatus

        org_id = uuid4()
        owner_id = uuid4()
        approver_id = uuid4()
        
        # Member with PENDING status
        member = OrganizationMember(
            id=uuid4(),
            organization_id=org_id,
            user_id=uuid4(),
            status=MemberStatus.PENDING,
            created_at=datetime.now(),
        )
        
        org = Organization(
            id=org_id,
            name="Test Org",
            slug="test-slug",
            description="Test",
            owner_id=owner_id,
            privacy="PUBLIC",
            join_policy="REQUEST_ONLY",
            status="ACTIVE",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        organizer = OrganizationOrganizer(
            id=uuid4(),
            organization_id=org_id,
            user_id=approver_id,
            created_at=datetime.now(),
        )

        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = member
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = org
        mock_result3 = MagicMock()
        mock_result3.scalar_one_or_none.return_value = organizer

        mock_session.execute.side_effect = [mock_result1, mock_result2, mock_result3]

        result = await repository.get_pending_membership_for_approval(
            member.id, "test-slug", approver_id
        )

        assert result == member

    @pytest.mark.asyncio
    async def test_get_pending_membership_for_approval_not_authorized(
        self, repository, mock_session
    ):
        """Test get_pending_membership_for_approval when approver has no permission."""
        from uuid import uuid4
        from datetime import datetime
        from auth_service.infrastructure.database.models.organization_model import (
            OrganizationMember,
            Organization,
        )
        from auth_service.infrastructure.database.models.enums import MemberStatus

        org_id = uuid4()
        owner_id = uuid4()
        unauthorized_user_id = uuid4()
        
        member = OrganizationMember(
            id=uuid4(),
            organization_id=org_id,
            user_id=uuid4(),
            status=MemberStatus.PENDING,
            created_at=datetime.now(),
        )
        
        org = Organization(
            id=org_id,
            name="Test Org",
            slug="test-slug",
            description="Test",
            owner_id=owner_id,
            privacy="PUBLIC",
            join_policy="REQUEST_ONLY",
            status="ACTIVE",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = member
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = org
        mock_result3 = MagicMock()
        mock_result3.scalar_one_or_none.return_value = None  # Not an organizer

        mock_session.execute.side_effect = [mock_result1, mock_result2, mock_result3]

        result = await repository.get_pending_membership_for_approval(
            member.id, "test-slug", unauthorized_user_id
        )

        assert result is None


class TestOrgRoleConstants:
    """Tests for OrgRole constants from repository."""

    def test_owner_constant(self):
        """Test OWNER constant value."""
        assert OrgRole.OWNER == "OWNER"

    def test_organizer_constant(self):
        """Test ORGANIZER constant value."""
        assert OrgRole.ORGANIZER == "ORGANIZER"

    def test_member_constant(self):
        """Test MEMBER constant value."""
        assert OrgRole.MEMBER == "MEMBER"

    def test_none_constant(self):
        """Test NONE constant value."""
        assert OrgRole.NONE == "NONE"
