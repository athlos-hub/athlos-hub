"""Integration tests for admin endpoints."""

import pytest
from uuid import uuid4


class TestGetAllUsers:
    """Tests for GET /admin/users endpoint."""

    @pytest.mark.asyncio
    async def test_get_all_users_without_auth(self, client):
        """Test getting all users fails without authentication."""
        response = await client.get("/api/v1/admin/users")
        
        # Should require authentication
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_get_all_users_with_invalid_token(self, client):
        """Test getting all users with invalid token."""
        response = await client.get(
            "/api/v1/admin/users",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should return unauthorized
        assert response.status_code == 401


class TestSuspendUser:
    """Tests for DELETE /admin/users/{user_id} endpoint."""

    @pytest.mark.asyncio
    async def test_suspend_user_without_auth(self, client):
        """Test suspending user fails without authentication."""
        user_id = str(uuid4())
        response = await client.delete(f"/api/v1/admin/users/{user_id}")
        
        # Should require authentication
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_suspend_user_with_invalid_token(self, client):
        """Test suspending user with invalid token."""
        user_id = str(uuid4())
        response = await client.delete(
            f"/api/v1/admin/users/{user_id}",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should return unauthorized
        assert response.status_code == 401


class TestUnsuspendUser:
    """Tests for PATCH /admin/users/{user_id}/unsuspend endpoint."""

    @pytest.mark.asyncio
    async def test_unsuspend_user_without_auth(self, client):
        """Test unsuspending user fails without authentication."""
        user_id = str(uuid4())
        response = await client.patch(f"/api/v1/admin/users/{user_id}/unsuspend")
        
        # Should require authentication
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_unsuspend_user_with_invalid_token(self, client):
        """Test unsuspending user with invalid token."""
        user_id = str(uuid4())
        response = await client.patch(
            f"/api/v1/admin/users/{user_id}/unsuspend",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should return unauthorized
        assert response.status_code == 401


class TestDeleteOrganization:
    """Tests for DELETE /admin/organizations/delete/{org_slug} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_org_without_auth(self, client):
        """Test deleting organization fails without authentication."""
        response = await client.delete("/api/v1/admin/organizations/delete/test-org")
        
        # Should require authentication
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_delete_org_with_invalid_token(self, client):
        """Test deleting organization with invalid token."""
        response = await client.delete(
            "/api/v1/admin/organizations/delete/test-org",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should return unauthorized
        assert response.status_code == 401


class TestAcceptOrganization:
    """Tests for PATCH /admin/organizations/accept/{org_slug} endpoint."""

    @pytest.mark.asyncio
    async def test_accept_org_without_auth(self, client):
        """Test accepting organization fails without authentication."""
        response = await client.patch("/api/v1/admin/organizations/accept/test-org")
        
        # Should require authentication
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_accept_org_with_invalid_token(self, client):
        """Test accepting organization with invalid token."""
        response = await client.patch(
            "/api/v1/admin/organizations/accept/test-org",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should return unauthorized
        assert response.status_code == 401


class TestSuspendOrganization:
    """Tests for DELETE /admin/organizations/suspend/{org_slug} endpoint."""

    @pytest.mark.asyncio
    async def test_suspend_org_without_auth(self, client):
        """Test suspending organization fails without authentication."""
        response = await client.delete("/api/v1/admin/organizations/suspend/test-org")
        
        # Should require authentication
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_suspend_org_with_invalid_token(self, client):
        """Test suspending organization with invalid token."""
        response = await client.delete(
            "/api/v1/admin/organizations/suspend/test-org",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should return unauthorized
        assert response.status_code == 401


class TestUnsuspendOrganization:
    """Tests for PATCH /admin/organizations/unsuspend/{org_slug} endpoint."""

    @pytest.mark.asyncio
    async def test_unsuspend_org_without_auth(self, client):
        """Test unsuspending organization fails without authentication."""
        response = await client.patch("/api/v1/admin/organizations/unsuspend/test-org")
        
        # Should require authentication
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_unsuspend_org_with_invalid_token(self, client):
        """Test unsuspending organization with invalid token."""
        response = await client.patch(
            "/api/v1/admin/organizations/unsuspend/test-org",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should return unauthorized
        assert response.status_code == 401


class TestGetOrganizationsByStatus:
    """Tests for GET /admin/organizations endpoint."""

    @pytest.mark.asyncio
    async def test_get_orgs_by_status_without_auth(self, client):
        """Test getting organizations by status fails without authentication."""
        response = await client.get("/api/v1/admin/organizations?status=ACTIVE")
        
        # Should require authentication
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_get_orgs_by_status_with_invalid_token(self, client):
        """Test getting organizations by status with invalid token."""
        response = await client.get(
            "/api/v1/admin/organizations?status=ACTIVE",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should return unauthorized
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_orgs_by_status_missing_status_param(self, client):
        """Test getting organizations without status parameter."""
        response = await client.get("/api/v1/admin/organizations")
        
        # Should require status parameter or auth
        assert response.status_code in [401, 403, 422]
