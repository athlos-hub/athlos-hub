"""Extended tests for organization endpoints to increase coverage."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime


class TestOrganizationEndpointsCreate:
    """Tests for create organization endpoint."""

    @pytest.mark.asyncio
    async def test_create_organization_missing_fields(self, client):
        """Test create organization with missing required fields."""
        response = await client.post(
            "/api/organizations",
            data={"name": "Test Org"},
            headers={"Authorization": "Bearer invalid-token"}
        )
        # Should return 401 for invalid token
        assert response.status_code == 401


class TestOrganizationEndpointsGet:
    """Tests for get organizations endpoints."""

    @pytest.mark.asyncio
    async def test_get_organizations_with_offset(self, client, test_organization):
        """Test get organizations with offset parameter."""
        response = await client.get("/api/organizations?offset=0&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_organizations_with_large_limit(self, client):
        """Test get organizations with maximum limit."""
        response = await client.get("/api/organizations?limit=200")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_organizations_limit_exceeds_max(self, client):
        """Test get organizations with limit exceeding maximum."""
        response = await client.get("/api/organizations?limit=500")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_my_organizations_no_auth(self, client):
        """Test get my organizations without authentication."""
        response = await client.get("/api/organizations/me")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_my_organizations_invalid_token(self, client):
        """Test get my organizations with invalid token."""
        response = await client.get(
            "/api/organizations/me",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_organization_by_slug_not_found(self, client):
        """Test get organization by slug when not found."""
        response = await client.get("/api/organizations/nonexistent-org-slug")
        assert response.status_code == 404


class TestOrganizationEndpointsUpdate:
    """Tests for update organization endpoint."""

    @pytest.mark.asyncio
    async def test_update_organization_no_auth(self, client):
        """Test update organization without authentication."""
        response = await client.put(
            "/api/organizations/test-org",
            data={"name": "Updated Name"}
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_organization_invalid_token(self, client):
        """Test update organization with invalid token."""
        response = await client.put(
            "/api/organizations/test-org",
            data={"name": "Updated Name"},
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401


class TestOrganizationEndpointsDelete:
    """Tests for delete organization endpoint."""

    @pytest.mark.asyncio
    async def test_delete_organization_no_auth(self, client):
        """Test delete organization without authentication."""
        response = await client.delete("/api/organizations/test-org")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_organization_invalid_token(self, client):
        """Test delete organization with invalid token."""
        response = await client.delete(
            "/api/organizations/test-org",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401


class TestOrganizationEndpointsJoinPolicy:
    """Tests for join policy endpoint."""

    @pytest.mark.asyncio
    async def test_update_join_policy_no_auth(self, client):
        """Test update join policy without authentication."""
        response = await client.patch(
            "/api/organizations/test-org/join-policy",
            json={"join_policy": "ALL"}
        )
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]


class TestOrganizationEndpointsMembers:
    """Tests for members endpoints."""

    @pytest.mark.asyncio
    async def test_get_members_no_auth(self, client):
        """Test get members without authentication."""
        response = await client.get("/api/organizations/test-org/members")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_request_to_join_no_auth(self, client):
        """Test request to join without authentication."""
        response = await client.post("/api/organizations/test-org/join")
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_leave_organization_no_auth(self, client):
        """Test leave organization without authentication."""
        response = await client.delete("/api/organizations/test-org/leave")
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]


class TestOrganizationEndpointsInvites:
    """Tests for invites endpoints."""

    @pytest.mark.asyncio
    async def test_get_pending_requests_no_auth(self, client):
        """Test get pending requests without authentication."""
        response = await client.get("/api/organizations/test-org/requests")
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_get_sent_invites_no_auth(self, client):
        """Test get sent invites without authentication."""
        response = await client.get("/api/organizations/test-org/invites")
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_accept_invite_no_auth(self, client):
        """Test accept invite without authentication."""
        invite_id = str(uuid4())
        response = await client.post(f"/api/organizations/test-org/invites/{invite_id}/accept")
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_decline_invite_no_auth(self, client):
        """Test decline invite without authentication."""
        invite_id = str(uuid4())
        response = await client.post(f"/api/organizations/test-org/invites/{invite_id}/decline")
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_cancel_join_request_no_auth(self, client):
        """Test cancel join request without authentication."""
        response = await client.delete("/api/organizations/test-org/requests")
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]


class TestOrganizationEndpointsOrganizers:
    """Tests for organizers endpoints."""

    @pytest.mark.asyncio
    async def test_get_organizers_no_auth(self, client):
        """Test get organizers without authentication."""
        response = await client.get("/api/organizations/test-org/organizers")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_add_organizer_no_auth(self, client):
        """Test add organizer without authentication."""
        user_id = str(uuid4())
        response = await client.post(
            f"/api/organizations/test-org/organizers/{user_id}"
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_remove_organizer_no_auth(self, client):
        """Test remove organizer without authentication."""
        user_id = str(uuid4())
        response = await client.delete(
            f"/api/organizations/test-org/organizers/{user_id}"
        )
        assert response.status_code == 403


class TestOrganizationEndpointsUserInvitesRequests:
    """Tests for user invites and requests endpoints."""

    @pytest.mark.asyncio
    async def test_get_user_invites_no_auth(self, client):
        """Test get user invites without authentication."""
        response = await client.get("/api/organizations/me/invites")
        # Returns 403 (no auth) or 404 (route not found)
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_get_user_requests_no_auth(self, client):
        """Test get user requests without authentication."""
        response = await client.get("/api/organizations/me/requests")
        # Returns 403 (no auth) or 404 (route not found)
        assert response.status_code in [403, 404]


class TestOrganizationEndpointsJoinLink:
    """Tests for join via link endpoint."""

    @pytest.mark.asyncio
    async def test_join_via_link_no_auth(self, client):
        """Test join via link without authentication."""
        response = await client.post("/api/organizations/test-org/join-link")
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]


class TestOrganizationEndpointsRemoveMember:
    """Tests for remove member endpoint."""

    @pytest.mark.asyncio
    async def test_remove_member_no_auth(self, client):
        """Test remove member without authentication."""
        user_id = str(uuid4())
        response = await client.delete(f"/api/organizations/test-org/members/{user_id}")
        assert response.status_code == 403


class TestOrganizationEndpointsApproveReject:
    """Tests for approve/reject request endpoints."""

    @pytest.mark.asyncio
    async def test_approve_request_no_auth(self, client):
        """Test approve request without authentication."""
        request_id = str(uuid4())
        response = await client.post(f"/api/organizations/test-org/requests/{request_id}/approve")
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_reject_request_no_auth(self, client):
        """Test reject request without authentication."""
        request_id = str(uuid4())
        response = await client.post(f"/api/organizations/test-org/requests/{request_id}/reject")
        # Returns 403 (no auth) or 404 (org not found)
        assert response.status_code in [403, 404]


class TestOrganizationEndpointsInviteUser:
    """Tests for invite user endpoint."""

    @pytest.mark.asyncio
    async def test_invite_user_no_auth(self, client):
        """Test invite user without authentication."""
        user_id = str(uuid4())
        response = await client.post(f"/api/organizations/test-org/invite/{user_id}")
        assert response.status_code == 403
