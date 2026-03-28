"""Extended tests for users endpoints to increase coverage."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


class TestUsersEndpointsGetMe:
    """Tests for get current user endpoint."""

    @pytest.mark.asyncio
    async def test_get_me_no_auth(self, client):
        """Test get me without authentication."""
        response = await client.get("/api/users/me")
        assert response.status_code == 403


class TestUsersEndpointsUpdateMe:
    """Tests for update current user endpoint."""

    @pytest.mark.asyncio
    async def test_update_me_no_auth(self, client):
        """Test update me without authentication."""
        response = await client.put(
            "/api/users/me",
            data={"first_name": "Updated"}
        )
        assert response.status_code == 403


class TestUsersEndpointsGetUsers:
    """Tests for get users endpoint."""

    @pytest.mark.asyncio
    async def test_get_users_list(self, client):
        """Test get list of users."""
        response = await client.get("/api/users/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestUsersEndpointsGetUserById:
    """Tests for get user by ID endpoint."""

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, client):
        """Test get user that doesn't exist."""
        user_id = str(uuid4())
        response = await client.get(f"/api/users/{user_id}")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_user_invalid_uuid(self, client):
        """Test get user with invalid UUID format."""
        response = await client.get("/api/users/invalid-uuid")
        assert response.status_code == 422


class TestUsersEndpointsAcceptInvite:
    """Tests for accept invite endpoint."""

    @pytest.mark.asyncio
    async def test_accept_invite_no_auth(self, client):
        """Test accept invite without authentication."""
        response = await client.post("/api/users/organizations/test-org/accept-invite")
        assert response.status_code == 403


class TestUsersEndpointsDeclineInvite:
    """Tests for decline invite endpoint."""

    @pytest.mark.asyncio
    async def test_decline_invite_no_auth(self, client):
        """Test decline invite without authentication."""
        response = await client.post("/api/users/organizations/test-org/decline-invite")
        assert response.status_code == 403


class TestUsersEndpointsLeaveOrganization:
    """Tests for leave organization endpoint."""

    @pytest.mark.asyncio
    async def test_leave_organization_no_auth(self, client):
        """Test leave organization without authentication."""
        response = await client.delete("/api/users/organizations/test-org/leave")
        assert response.status_code == 403


class TestUsersEndpointsGetMyInvites:
    """Tests for get my invites endpoint."""

    @pytest.mark.asyncio
    async def test_get_my_invites_no_auth(self, client):
        """Test get my invites without authentication."""
        response = await client.get("/api/users/organizations/invites")
        assert response.status_code == 403


class TestUsersEndpointsGetMyRequests:
    """Tests for get my requests endpoint."""

    @pytest.mark.asyncio
    async def test_get_my_requests_no_auth(self, client):
        """Test get my requests without authentication."""
        response = await client.get("/api/users/organizations/requests")
        assert response.status_code == 403
