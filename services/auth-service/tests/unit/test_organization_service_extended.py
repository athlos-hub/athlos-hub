"""Extended unit tests for OrganizationService - membership and organizer operations."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from auth_service.core.exceptions import (
    OrganizationNotFoundError,
    NotOwnerError,
    NotOwnerOrOrganizerError,
    MembershipNotFoundError,
    MembershipAlreadyExistsError,
    JoinPolicyViolationError,
    JoinRequestNotFoundError,
    InviteNotFoundError,
    OwnerCannotLeaveError,
    NotActiveMemberError,
    NotMemberError,
    CannotRemoveOwnerError,
    CannotRemoveSelfError,
    OrganizerAlreadyExistsError,
    OrganizerNotFoundError,
    OwnerNotNeedOrganizerError,
    MustBeActiveMemberError,
    AlreadyOwnerError,
    NewOwnerNotActiveMemberError,
    OrganizationInactiveError,
    UserNotFoundError,
)
from auth_service.services.organization_service import OrganizationService
from auth_service.infrastructure.database.models.enums import (
    OrganizationStatus,
    OrganizationPrivacy,
    OrganizationJoinPolicy,
    MemberStatus,
)
from auth_service.infrastructure.database.models.organization_model import (
    OrganizationMember,
    OrganizationOrganizer,
)


class TestOrganizationServiceRequestToJoin:
    """Tests for OrganizationService.request_to_join method."""

    @pytest.fixture
    def organization_service(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
    ):
        return OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

    @pytest.mark.asyncio
    async def test_request_to_join_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful join request."""
        mock_organization.join_policy = OrganizationJoinPolicy.REQUEST_ONLY
        mock_organization.status = OrganizationStatus.ACTIVE
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_member_repository.exists_membership.return_value = False
        mock_organization_member_repository.get_membership.return_value = None  # User not a member
        
        new_membership = OrganizationMember(
            id=uuid4(),
            organization_id=mock_organization.id,
            user_id=mock_user.id,
            status=MemberStatus.PENDING,
        )
        mock_organization_member_repository.create.return_value = new_membership
        mock_organization_member_repository.commit = AsyncMock()
        mock_organization_organizer_repository.get_organizers_by_org.return_value = []

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch.object(service, '_send_notification', new_callable=AsyncMock):
            result = await service.request_to_join(mock_organization.slug, mock_user)

        assert result.status == MemberStatus.PENDING
        mock_organization_member_repository.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_request_to_join_org_not_found(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test OrganizationNotFoundError when organization doesn't exist."""
        mock_organization_repository.get_by_slug.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(OrganizationNotFoundError):
            await service.request_to_join("nonexistent-slug", mock_user)


class TestOrganizationServiceCancelJoinRequest:
    """Tests for OrganizationService.cancel_join_request method."""

    @pytest.mark.asyncio
    async def test_cancel_join_request_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test successful cancellation of join request."""
        membership = OrganizationMember(
            id=uuid4(),
            organization_id=uuid4(),
            user_id=mock_user.id,
            status=MemberStatus.PENDING,
        )
        mock_organization_member_repository.get_membership_by_slug_and_status.return_value = membership
        mock_organization_member_repository.delete = AsyncMock()
        mock_organization_member_repository.commit = AsyncMock()

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        await service.cancel_join_request("test-slug", mock_user)

        mock_organization_member_repository.delete.assert_called_once_with(membership)
        mock_organization_member_repository.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_cancel_join_request_not_found(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test JoinRequestNotFoundError when no pending request exists."""
        mock_organization_member_repository.get_membership_by_slug_and_status.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(JoinRequestNotFoundError):
            await service.cancel_join_request("test-slug", mock_user)


class TestOrganizationServiceJoinViaLink:
    """Tests for OrganizationService.join_via_link method."""

    @pytest.mark.asyncio
    async def test_join_via_link_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful join via link."""
        mock_organization.join_policy = OrganizationJoinPolicy.LINK_ONLY
        mock_organization.status = OrganizationStatus.ACTIVE
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_member_repository.exists_membership.return_value = False
        mock_organization_member_repository.get_membership.return_value = None  # User not a member
        
        new_membership = OrganizationMember(
            id=uuid4(),
            organization_id=mock_organization.id,
            user_id=mock_user.id,
            status=MemberStatus.ACTIVE,
        )
        mock_organization_member_repository.create.return_value = new_membership
        mock_organization_member_repository.commit = AsyncMock()

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.join_via_link(mock_organization.slug, mock_user)

        assert result.status == MemberStatus.ACTIVE
        mock_organization_member_repository.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_join_via_link_org_not_found(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test OrganizationNotFoundError when organization doesn't exist."""
        mock_organization_repository.get_by_slug.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(OrganizationNotFoundError):
            await service.join_via_link("nonexistent-slug", mock_user)


class TestOrganizationServiceAcceptDeclineInvite:
    """Tests for accept/decline invite methods."""

    @pytest.mark.asyncio
    async def test_accept_invite_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful invite acceptance."""
        membership = OrganizationMember(
            id=uuid4(),
            organization_id=mock_organization.id,
            user_id=mock_user.id,
            status=MemberStatus.INVITED,
        )
        mock_organization_member_repository.get_membership_by_slug_and_status.return_value = membership
        mock_organization_member_repository.update_status = AsyncMock()
        mock_organization_member_repository.commit = AsyncMock()
        mock_organization_repository.get_by_slug.return_value = mock_organization

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch.object(service, '_send_notification', new_callable=AsyncMock):
            await service.accept_invite(mock_organization.slug, mock_user)

        mock_organization_member_repository.update_status.assert_called_once_with(
            membership, MemberStatus.ACTIVE
        )

    @pytest.mark.asyncio
    async def test_accept_invite_not_found(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test InviteNotFoundError when no invite exists."""
        mock_organization_member_repository.get_membership_by_slug_and_status.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(InviteNotFoundError):
            await service.accept_invite("test-slug", mock_user)

    @pytest.mark.asyncio
    async def test_decline_invite_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful invite decline."""
        membership = OrganizationMember(
            id=uuid4(),
            organization_id=mock_organization.id,
            user_id=mock_user.id,
            status=MemberStatus.INVITED,
        )
        mock_organization_member_repository.get_membership_by_slug_and_status.return_value = membership
        mock_organization_member_repository.delete = AsyncMock()
        mock_organization_member_repository.commit = AsyncMock()
        mock_organization_repository.get_by_id.return_value = mock_organization
        mock_organization_organizer_repository.get_organizers_by_org.return_value = []

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch.object(service, '_send_notification', new_callable=AsyncMock):
            await service.decline_invite(mock_organization.slug, mock_user)

        mock_organization_member_repository.delete.assert_called_once_with(membership)

    @pytest.mark.asyncio
    async def test_decline_invite_not_found(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test InviteNotFoundError when no invite exists."""
        mock_organization_member_repository.get_membership_by_slug_and_status.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(InviteNotFoundError):
            await service.decline_invite("test-slug", mock_user)


class TestOrganizationServiceLeaveOrganization:
    """Tests for OrganizationService.leave_organization method."""

    @pytest.mark.asyncio
    async def test_leave_organization_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful leave from organization."""
        other_owner_id = uuid4()
        mock_organization.owner_id = other_owner_id  # Different owner
        membership = OrganizationMember(
            id=uuid4(),
            organization_id=mock_organization.id,
            user_id=mock_user.id,
            status=MemberStatus.ACTIVE,
        )
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_organizer_repository.get_organizer.return_value = None
        mock_organization_member_repository.get_membership_by_status.return_value = membership
        mock_organization_member_repository.delete = AsyncMock()
        mock_organization_member_repository.commit = AsyncMock()
        mock_organization_organizer_repository.get_organizers_by_org.return_value = []

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch.object(service, '_send_notification', new_callable=AsyncMock):
            await service.leave_organization(mock_organization.slug, mock_user)

        mock_organization_member_repository.delete.assert_called_once_with(membership)

    @pytest.mark.asyncio
    async def test_leave_organization_owner_cannot_leave(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test OwnerCannotLeaveError when owner tries to leave."""
        mock_organization.owner_id = mock_user.id  # User is owner
        mock_organization_repository.get_by_slug.return_value = mock_organization

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(OwnerCannotLeaveError):
            await service.leave_organization(mock_organization.slug, mock_user)

    @pytest.mark.asyncio
    async def test_leave_organization_not_active_member(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test NotActiveMemberError when user is not an active member."""
        mock_organization.owner_id = uuid4()  # Different owner
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_organizer_repository.get_organizer.return_value = None
        mock_organization_member_repository.get_membership_by_status.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(NotActiveMemberError):
            await service.leave_organization(mock_organization.slug, mock_user)

    @pytest.mark.asyncio
    async def test_leave_organization_not_found(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test OrganizationNotFoundError when organization doesn't exist."""
        mock_organization_repository.get_by_slug.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(OrganizationNotFoundError):
            await service.leave_organization("nonexistent-slug", mock_user)


class TestOrganizationServiceInviteUser:
    """Tests for OrganizationService.invite_user method."""

    @pytest.mark.asyncio
    async def test_invite_user_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful user invitation."""
        invited_user_id = uuid4()
        invited_user = mock_user.__class__(
            id=invited_user_id,
            keycloak_id="keycloak-invited",
            email="invited@example.com",
            username="invited",
            enabled=True,
        )
        mock_organization.status = OrganizationStatus.ACTIVE
        mock_organization_organizer_repository.is_owner_or_organizer.return_value = mock_organization
        mock_user_repository.get_by_id.return_value = invited_user
        mock_organization_member_repository.exists_membership.return_value = False
        mock_organization_member_repository.create = AsyncMock()
        mock_organization_member_repository.commit = AsyncMock()

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch.object(service, '_send_notification', new_callable=AsyncMock):
            await service.invite_user(mock_organization.slug, mock_user, invited_user_id)

        mock_organization_member_repository.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_invite_user_not_owner_or_organizer(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test NotOwnerOrOrganizerError when user has no permission."""
        mock_organization_organizer_repository.is_owner_or_organizer.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(NotOwnerOrOrganizerError):
            await service.invite_user("test-slug", mock_user, uuid4())

    @pytest.mark.asyncio
    async def test_invite_user_already_member(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test MembershipAlreadyExistsError when user already has relationship."""
        invited_user_id = uuid4()
        invited_user = mock_user.__class__(
            id=invited_user_id,
            keycloak_id="keycloak-invited",
            email="invited@example.com",
            username="invited",
            enabled=True,
        )
        mock_organization.status = OrganizationStatus.ACTIVE
        mock_organization_organizer_repository.is_owner_or_organizer.return_value = mock_organization
        mock_user_repository.get_by_id.return_value = invited_user
        mock_organization_member_repository.exists_membership.return_value = True

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(MembershipAlreadyExistsError):
            await service.invite_user(mock_organization.slug, mock_user, invited_user_id)


class TestOrganizationServiceRemoveMember:
    """Tests for OrganizationService.remove_member method."""

    @pytest.mark.asyncio
    async def test_remove_member_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful member removal by owner."""
        member_to_remove_id = uuid4()
        mock_organization.owner_id = mock_user.id
        mock_organization.status = OrganizationStatus.ACTIVE
        membership = OrganizationMember(
            id=uuid4(),
            organization_id=mock_organization.id,
            user_id=member_to_remove_id,
            status=MemberStatus.ACTIVE,
        )
        removed_user = mock_user.__class__(
            id=member_to_remove_id,
            keycloak_id="keycloak-removed",
            email="removed@example.com",
            username="removed",
            enabled=True,
        )
        
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_organizer_repository.is_organizer.return_value = False
        mock_organization_organizer_repository.get_organizer.return_value = None
        mock_organization_member_repository.get_membership_by_status.return_value = membership
        mock_organization_member_repository.delete = AsyncMock()
        mock_organization_member_repository.commit = AsyncMock()
        mock_user_repository.get_by_id.return_value = removed_user

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch.object(service, '_send_notification', new_callable=AsyncMock):
            await service.remove_member(mock_organization.slug, mock_user, member_to_remove_id)

        mock_organization_member_repository.delete.assert_called_once_with(membership)

    @pytest.mark.asyncio
    async def test_remove_member_cannot_remove_owner(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test CannotRemoveOwnerError when trying to remove owner."""
        mock_organization.owner_id = mock_user.id
        mock_organization.status = OrganizationStatus.ACTIVE
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_organizer_repository.is_organizer.return_value = False

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(CannotRemoveOwnerError):
            await service.remove_member(mock_organization.slug, mock_user, mock_user.id)

    @pytest.mark.asyncio
    async def test_remove_member_cannot_remove_self(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test CannotRemoveSelfError when trying to remove self."""
        owner_id = uuid4()
        mock_organization.owner_id = owner_id
        mock_organization.status = OrganizationStatus.ACTIVE
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_organizer_repository.is_organizer.return_value = True

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(CannotRemoveSelfError):
            await service.remove_member(mock_organization.slug, mock_user, mock_user.id)


class TestOrganizationServiceGetMembersOrganizers:
    """Tests for get_members and get_organizers methods."""

    @pytest.mark.asyncio
    async def test_get_members_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful retrieval of organization members."""
        membership = OrganizationMember(
            id=uuid4(),
            organization_id=mock_organization.id,
            user_id=mock_user.id,
            status=MemberStatus.ACTIVE,
        )
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_member_repository.get_membership_by_status.return_value = membership
        mock_organization_member_repository.get_members_by_org.return_value = [membership]

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.get_members(mock_organization.slug, mock_user)

        assert len(result) == 1
        mock_organization_member_repository.get_members_by_org.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_members_not_member(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test NotMemberError when user is not a member."""
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_member_repository.get_membership_by_status.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(NotMemberError):
            await service.get_members(mock_organization.slug, mock_user)

    @pytest.mark.asyncio
    async def test_get_organizers_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful retrieval of organization organizers."""
        membership = OrganizationMember(
            id=uuid4(),
            organization_id=mock_organization.id,
            user_id=mock_user.id,
            status=MemberStatus.ACTIVE,
        )
        organizer = OrganizationOrganizer(
            id=uuid4(),
            organization_id=mock_organization.id,
            user_id=mock_user.id,
        )
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_member_repository.get_membership_by_status.return_value = membership
        mock_organization_organizer_repository.get_organizers_by_org.return_value = [organizer]

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.get_organizers(mock_organization.slug, mock_user)

        assert len(result) == 1
        mock_organization_organizer_repository.get_organizers_by_org.assert_called_once()


class TestOrganizationServiceApproveRejectRequest:
    """Tests for approve and reject join request methods."""

    @pytest.mark.asyncio
    async def test_approve_join_request_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful approval of join request."""
        membership_id = uuid4()
        membership = OrganizationMember(
            id=membership_id,
            organization_id=mock_organization.id,
            user_id=uuid4(),
            status=MemberStatus.PENDING,
        )
        mock_organization.status = OrganizationStatus.ACTIVE
        mock_organization_member_repository.get_pending_membership_for_approval.return_value = membership
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_member_repository.update_status = AsyncMock()
        mock_organization_member_repository.commit = AsyncMock()
        mock_user_repository.get_by_id.return_value = mock_user

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch.object(service, '_send_notification', new_callable=AsyncMock):
            result = await service.approve_join_request(mock_organization.slug, mock_user, membership_id)

        assert result == membership
        mock_organization_member_repository.update_status.assert_called_once()

    @pytest.mark.asyncio
    async def test_approve_join_request_not_found(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test MembershipNotFoundError when request doesn't exist."""
        mock_organization_member_repository.get_pending_membership_for_approval.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(MembershipNotFoundError):
            await service.approve_join_request("test-slug", mock_user, uuid4())

    @pytest.mark.asyncio
    async def test_reject_join_request_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful rejection of join request."""
        membership_id = uuid4()
        membership = OrganizationMember(
            id=membership_id,
            organization_id=mock_organization.id,
            user_id=uuid4(),
            status=MemberStatus.PENDING,
        )
        mock_organization.status = OrganizationStatus.ACTIVE
        mock_organization_member_repository.get_pending_membership_for_approval.return_value = membership
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_member_repository.delete = AsyncMock()
        mock_organization_member_repository.commit = AsyncMock()
        mock_user_repository.get_by_id.return_value = mock_user

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch.object(service, '_send_notification', new_callable=AsyncMock):
            await service.reject_join_request(mock_organization.slug, mock_user, membership_id)

        mock_organization_member_repository.delete.assert_called_once_with(membership)


class TestOrganizationServicePendingRequestsInvites:
    """Tests for get_pending_requests, get_sent_invites, get_user_invites, get_user_requests."""

    @pytest.mark.asyncio
    async def test_get_pending_requests_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful retrieval of pending requests."""
        mock_organization_organizer_repository.is_owner_or_organizer.return_value = mock_organization
        mock_organization_member_repository.get_pending_requests.return_value = []

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.get_pending_requests(mock_organization.slug, mock_user)

        assert result == []
        mock_organization_member_repository.get_pending_requests.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_pending_requests_not_owner_or_organizer(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test NotOwnerOrOrganizerError when user has no permission."""
        mock_organization_organizer_repository.is_owner_or_organizer.return_value = None

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(NotOwnerOrOrganizerError):
            await service.get_pending_requests("test-slug", mock_user)

    @pytest.mark.asyncio
    async def test_get_sent_invites_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful retrieval of sent invites."""
        mock_organization_organizer_repository.is_owner_or_organizer.return_value = mock_organization
        mock_organization_member_repository.get_sent_invites.return_value = []

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.get_sent_invites(mock_organization.slug, mock_user)

        assert result == []
        mock_organization_member_repository.get_sent_invites.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_user_invites_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test successful retrieval of user's received invites."""
        mock_organization_member_repository.get_user_invites.return_value = []

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.get_user_invites(mock_user)

        assert result == []
        mock_organization_member_repository.get_user_invites.assert_called_once_with(mock_user.id)

    @pytest.mark.asyncio
    async def test_get_user_requests_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test successful retrieval of user's sent requests."""
        mock_organization_member_repository.get_user_requests.return_value = []

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.get_user_requests(mock_user)

        assert result == []
        mock_organization_member_repository.get_user_requests.assert_called_once_with(mock_user.id)


class TestOrganizationServiceSendNotification:
    """Tests for OrganizationService._send_notification method."""

    @pytest.mark.asyncio
    async def test_send_notification_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_organization,
    ):
        """Test successful notification sending."""
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch("auth_service.services.organization_service.httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None
            mock_client_class.return_value = mock_client

            await service._send_notification(
                user_id=uuid4(),
                notification_type="test_notification",
                title="Test Title",
                message="Test Message",
                organization=mock_organization,
                extra_data={"key": "value"},
            )

            mock_client.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_notification_http_error(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_organization,
    ):
        """Test notification sending handles HTTP errors gracefully."""
        import httpx

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch("auth_service.services.organization_service.httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.text = "Error"
            error = httpx.HTTPStatusError("Error", request=MagicMock(), response=mock_response)
            mock_response.raise_for_status.side_effect = error
            mock_client.post.return_value = mock_response
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None
            mock_client_class.return_value = mock_client

            # Should not raise, just log error
            await service._send_notification(
                user_id=uuid4(),
                notification_type="test_notification",
                title="Test Title",
                message="Test Message",
                organization=mock_organization,
            )

    @pytest.mark.asyncio
    async def test_send_notification_connection_error(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_organization,
    ):
        """Test notification sending handles connection errors gracefully."""
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with patch("auth_service.services.organization_service.httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.post.side_effect = Exception("Connection error")
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None
            mock_client_class.return_value = mock_client

            # Should not raise, just log error
            await service._send_notification(
                user_id=uuid4(),
                notification_type="test_notification",
                title="Test Title",
                message="Test Message",
                organization=mock_organization,
            )


class TestOrganizationServiceUpdateMethods:
    """Tests for OrganizationService update methods."""

    @pytest.mark.asyncio
    async def test_update_organization_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful organization update."""
        mock_organization.owner_id = mock_user.id
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_repository.update = AsyncMock(return_value=mock_organization)
        mock_organization_repository.commit = AsyncMock()

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.update_organization(
            mock_organization.slug, mock_user, {"name": "Updated Name"}
        )

        assert result == mock_organization
        mock_organization_repository.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_organization_not_owner(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test NotOwnerError when non-owner tries to update."""
        from auth_service.core.exceptions import NotOwnerError

        mock_organization.owner_id = uuid4()  # Different from mock_user.id
        mock_organization_repository.get_by_slug.return_value = mock_organization

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(NotOwnerError):
            await service.update_organization(
                mock_organization.slug, mock_user, {"name": "Updated Name"}
            )

    @pytest.mark.asyncio
    async def test_delete_organization_by_owner_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful organization deletion by owner."""
        mock_organization.owner_id = mock_user.id
        mock_organization.status = OrganizationStatus.ACTIVE
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_repository.commit = AsyncMock()

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        await service.delete_organization_by_owner(mock_organization.slug, mock_user)

        assert mock_organization.status == OrganizationStatus.EXCLUDED
        mock_organization_repository.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_organization_by_owner_not_owner(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test NotOwnerError when non-owner tries to delete."""
        from auth_service.core.exceptions import NotOwnerError

        mock_organization.owner_id = uuid4()
        mock_organization.status = OrganizationStatus.ACTIVE
        mock_organization_repository.get_by_slug.return_value = mock_organization

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(NotOwnerError):
            await service.delete_organization_by_owner(mock_organization.slug, mock_user)

    @pytest.mark.asyncio
    async def test_delete_organization_already_excluded(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test OrganizationInactiveError when org is already excluded."""
        from auth_service.core.exceptions import OrganizationInactiveError

        mock_organization.owner_id = mock_user.id
        mock_organization.status = OrganizationStatus.EXCLUDED
        mock_organization_repository.get_by_slug.return_value = mock_organization

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(OrganizationInactiveError):
            await service.delete_organization_by_owner(mock_organization.slug, mock_user)

    @pytest.mark.asyncio
    async def test_update_join_policy_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful join policy update."""
        mock_organization.owner_id = mock_user.id
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_repository.commit = AsyncMock()

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.update_join_policy(
            mock_organization.slug, mock_user, OrganizationJoinPolicy.ALL
        )

        assert result.join_policy == OrganizationJoinPolicy.ALL
        mock_organization_repository.commit.assert_called()

    @pytest.mark.asyncio
    async def test_update_join_policy_not_owner(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test NotOwnerError when non-owner tries to update join policy."""
        from auth_service.core.exceptions import NotOwnerError

        mock_organization.owner_id = uuid4()
        mock_organization_repository.get_by_slug.return_value = mock_organization

        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(NotOwnerError):
            await service.update_join_policy(
                mock_organization.slug, mock_user, OrganizationJoinPolicy.ALL
            )
