"""Extended tests for admin endpoints to increase coverage."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


class TestAdminEndpointsGetUsers:
    """Tests for admin get users endpoint."""

    @pytest.mark.asyncio
    async def test_get_all_users_requires_admin(self, client):
        """Test get all users requires admin role."""
        response = await client.get("/api/admin/users")
        assert response.status_code in [401, 403]


class TestAdminEndpointsSuspendUser:
    """Tests for admin suspend user endpoint."""

    @pytest.mark.asyncio
    async def test_suspend_user_requires_admin(self, client):
        """Test suspend user requires admin role."""
        user_id = str(uuid4())
        response = await client.delete(f"/api/admin/users/{user_id}")
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_suspend_user_invalid_uuid(self, client):
        """Test suspend user with invalid UUID format."""
        response = await client.delete(
            "/api/admin/users/invalid-uuid",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code in [401, 422]


class TestAdminEndpointsUnsuspendUser:
    """Tests for admin unsuspend user endpoint."""

    @pytest.mark.asyncio
    async def test_unsuspend_user_requires_admin(self, client):
        """Test unsuspend user requires admin role."""
        user_id = str(uuid4())
        response = await client.patch(f"/api/admin/users/{user_id}/unsuspend")
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_unsuspend_user_invalid_uuid(self, client):
        """Test unsuspend user with invalid UUID format."""
        response = await client.patch(
            "/api/admin/users/invalid-uuid/unsuspend",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code in [401, 422]


class TestAdminEndpointsGetOrganizations:
    """Tests for admin get organizations endpoint."""

    @pytest.mark.asyncio
    async def test_get_all_organizations_requires_admin(self, client):
        """Test get all organizations requires admin role."""
        response = await client.get("/api/admin/organizations")
        assert response.status_code in [401, 403]


class TestAdminEndpointsApproveOrganization:
    """Tests for admin approve organization endpoint."""

    @pytest.mark.asyncio
    async def test_approve_organization_requires_admin(self, client):
        """Test approve organization requires admin role."""
        response = await client.patch("/api/admin/organizations/accept/test-org")
        assert response.status_code in [401, 403]


class TestAdminEndpointsRejectOrganization:
    """Tests for admin reject organization endpoint."""

    @pytest.mark.asyncio
    async def test_reject_organization_requires_admin(self, client):
        """Test reject organization requires admin role."""
        response = await client.delete("/api/admin/organizations/delete/test-org")
        assert response.status_code in [401, 403]


class TestAdminEndpointsSuspendOrganization:
    """Tests for admin suspend organization endpoint."""

    @pytest.mark.asyncio
    async def test_suspend_organization_requires_admin(self, client):
        """Test suspend organization requires admin role."""
        response = await client.delete("/api/admin/organizations/suspend/test-org")
        assert response.status_code in [401, 403]


class TestAdminEndpointsUnsuspendOrganization:
    """Tests for admin unsuspend organization endpoint."""

    @pytest.mark.asyncio
    async def test_unsuspend_organization_requires_admin(self, client):
        """Test unsuspend organization requires admin role."""
        response = await client.patch("/api/admin/organizations/unsuspend/test-org")
        assert response.status_code in [401, 403]


class TestAdminEndpointsDeleteOrganization:
    """Tests for admin delete organization endpoint."""

    @pytest.mark.asyncio
    async def test_delete_organization_requires_admin(self, client):
        """Test delete organization requires admin role."""
        response = await client.delete("/api/admin/organizations/delete/test-org")
        assert response.status_code in [401, 403]
