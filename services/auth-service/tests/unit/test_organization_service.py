"""Unit tests for OrganizationService."""

import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from auth_service.core.exceptions import (
    OrganizationNotFoundError,
    NotOwnerError,
    MembershipNotFoundError,
)
from auth_service.services.organization_service import OrganizationService
from auth_service.infrastructure.database.models.enums import (
    OrganizationStatus,
    OrganizationPrivacy,
    OrganizationJoinPolicy,
)


class TestOrganizationServiceCreateOrganization:
    """Tests for OrganizationService.create_organization method."""

    @pytest.mark.asyncio
    async def test_create_organization_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test successful organization creation."""
        mock_organization_repository.exists_by_slug.return_value = False
        mock_organization_repository.create.return_value = mock_organization
        mock_organization_repository.commit = AsyncMock()
        mock_organization_member_repository.create = AsyncMock()
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.create_organization(
            name="Test Organization",
            owner=mock_user,
            description="A test organization",
        )

        assert result.name == "Test Organization"
        assert result.owner_id == mock_user.id
        mock_organization_repository.create.assert_called_once()
        mock_organization_member_repository.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_organization_slug_exists(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
    ):
        """Test OrganizationAlreadyExistsError when slug already exists."""
        from auth_service.core.exceptions import OrganizationAlreadyExistsError
        
        mock_organization_repository.exists_by_slug.return_value = True
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(OrganizationAlreadyExistsError):
            await service.create_organization(
                name="Test Organization",
                owner=mock_user,
            )


class TestOrganizationServiceGetOrganizationBySlug:
    """Tests for OrganizationService.get_organization_by_slug method."""

    @pytest.mark.asyncio
    async def test_get_organization_by_slug_public(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_organization,
    ):
        """Test retrieval of public organization without authentication."""
        mock_organization.privacy = OrganizationPrivacy.PUBLIC
        mock_organization_repository.get_by_slug.return_value = mock_organization
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.get_organization_by_slug(mock_organization.slug)

        assert result.id == mock_organization.id
        assert result.slug == mock_organization.slug

    @pytest.mark.asyncio
    async def test_get_organization_by_slug_not_found(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
    ):
        """Test OrganizationNotFoundError when slug doesn't exist."""
        mock_organization_repository.get_by_slug.return_value = None
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(OrganizationNotFoundError):
            await service.get_organization_by_slug("nonexistent-slug")

    @pytest.mark.asyncio
    async def test_get_organization_by_slug_inactive(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_organization,
    ):
        """Test OrganizationInactiveError when organization is inactive."""
        from auth_service.core.exceptions import OrganizationInactiveError
        
        mock_organization.status = OrganizationStatus.EXCLUDED
        mock_organization_repository.get_by_slug.return_value = mock_organization
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(OrganizationInactiveError):
            await service.get_organization_by_slug(mock_organization.slug)


class TestOrganizationServiceGetOrganizations:
    """Tests for OrganizationService.get_organizations method."""

    @pytest.mark.asyncio
    async def test_get_organizations_success(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_organization,
    ):
        """Test retrieval of organizations."""
        mock_organization_repository.get_all.return_value = [mock_organization]
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.get_organizations()

        assert len(result) == 1
        assert result[0].id == mock_organization.id
        mock_organization_repository.get_all.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_organizations_empty(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
    ):
        """Test retrieval of organizations when none exist."""
        mock_organization_repository.get_all.return_value = []
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.get_organizations()

        assert len(result) == 0


class TestOrganizationServiceUpdateOrganization:
    """Tests for OrganizationService.update_organization method."""

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
        """Test successful organization update by owner."""
        mock_organization.owner_id = mock_user.id
        updated_data = {"description": "Updated description"}
        mock_organization.description = "Updated description"
        
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_repository.update.return_value = mock_organization
        mock_organization_repository.commit = AsyncMock()
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        result = await service.update_organization(
            slug=mock_organization.slug,
            user=mock_user,
            data=updated_data,
        )

        assert result.description == "Updated description"
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
        """Test NotOwnerError when user is not organization owner."""
        other_user_id = uuid4()
        mock_organization.owner_id = other_user_id
        
        mock_organization_repository.get_by_slug.return_value = mock_organization
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(NotOwnerError):
            await service.update_organization(
                slug=mock_organization.slug,
                user=mock_user,
                data={"description": "New description"},
            )

    @pytest.mark.asyncio
    async def test_update_organization_not_found(
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
            await service.update_organization(
                slug="nonexistent-slug",
                user=mock_user,
                data={"description": "New description"},
            )


class TestOrganizationServiceDeleteOrganization:
    """Tests for OrganizationService.delete_organization_by_owner method."""

    @pytest.mark.asyncio
    async def test_delete_organization_success(
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

        await service.delete_organization_by_owner(
            slug=mock_organization.slug,
            user=mock_user,
        )

        assert mock_organization.status == OrganizationStatus.EXCLUDED
        mock_organization_repository.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_organization_not_owner(
        self,
        mock_organization_repository,
        mock_organization_member_repository,
        mock_organization_organizer_repository,
        mock_user_repository,
        mock_user,
        mock_organization,
    ):
        """Test NotOwnerError when user is not organization owner."""
        other_user_id = uuid4()
        mock_organization.owner_id = other_user_id
        mock_organization_repository.get_by_slug.return_value = mock_organization
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(NotOwnerError):
            await service.delete_organization_by_owner(
                slug=mock_organization.slug,
                user=mock_user,
            )

    @pytest.mark.asyncio
    async def test_delete_organization_not_found(
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
            await service.delete_organization_by_owner(
                slug="nonexistent-slug",
                user=mock_user,
            )


class TestOrganizationServiceUpdateJoinPolicy:
    """Tests for OrganizationService.update_join_policy method."""

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
        """Test successful join policy update by owner."""
        mock_organization.owner_id = mock_user.id
        new_policy = OrganizationJoinPolicy.REQUEST_AND_LINK
        
        mock_organization_repository.get_by_slug.return_value = mock_organization
        mock_organization_repository.commit = AsyncMock()
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        await service.update_join_policy(
            slug=mock_organization.slug,
            user=mock_user,
            join_policy=new_policy,
        )

        assert mock_organization.join_policy == new_policy
        mock_organization_repository.commit.assert_called_once()

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
        """Test NotOwnerError when user is not organization owner."""
        other_user_id = uuid4()
        mock_organization.owner_id = other_user_id
        mock_organization_repository.get_by_slug.return_value = mock_organization
        
        service = OrganizationService(
            org_repository=mock_organization_repository,
            member_repository=mock_organization_member_repository,
            organizer_repository=mock_organization_organizer_repository,
            user_repository=mock_user_repository,
        )

        with pytest.raises(NotOwnerError):
            await service.update_join_policy(
                slug=mock_organization.slug,
                user=mock_user,
                join_policy=OrganizationJoinPolicy.REQUEST_AND_LINK,
            )
