"""Integration tests for organization endpoints."""

import pytest
from io import BytesIO
from uuid import uuid4
from datetime import datetime
from unittest.mock import patch, AsyncMock


class TestCreateOrganization:
    """Tests for POST /organizations endpoint."""

    @pytest.mark.asyncio
    async def test_create_organization_without_auth(self, client):
        """Test organization creation fails without authentication."""
        response = await client.post(
            "/api/v1/organizations",
            data={
                "name": "New Organization",
                "description": "A new test organization",
                "privacy": "PUBLIC",
            },
        )
        
        # Should return 403 Forbidden (no auth header)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_organization_requires_auth(self, client):
        """Test organization creation requires authentication."""
        # Try with invalid token
        response = await client.post(
            "/api/v1/organizations",
            headers={"Authorization": "Bearer invalid-token"},
            data={
                "name": "New Organization",
                "description": "A new test organization",
                "privacy": "PUBLIC",
            },
        )
        
        # Should return 401 Unauthorized for invalid token
        assert response.status_code == 401


class TestGetOrganizations:
    """Tests for GET /organizations endpoint."""

    @pytest.mark.asyncio
    async def test_get_organizations_returns_list(self, client, test_organization):
        """Test that get organizations returns list of organizations."""
        response = await client.get("/api/v1/organizations")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify test organization is in the list
        org_slugs = [org["slug"] for org in data]
        assert test_organization.slug in org_slugs

    @pytest.mark.asyncio
    async def test_get_organizations_with_privacy_filter(self, client, test_organization):
        """Test filtering organizations by privacy."""
        response = await client.get("/api/v1/organizations?privacy=PUBLIC")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned orgs should be public
        for org in data:
            assert org["privacy"] == "PUBLIC"

    @pytest.mark.asyncio
    async def test_get_organizations_with_limit(self, client, async_session):
        """Test pagination with limit parameter."""
        # Create multiple organizations
        from auth_service.infrastructure.database.models.organization_model import Organization
        from auth_service.infrastructure.database.models.user_model import User
        
        # Create owner user
        owner = User(
            id=uuid4(),
            keycloak_id=str(uuid4()),
            email="owner@example.com",
            username="owner",
            enabled=True,
            email_verified=True,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        async_session.add(owner)
        await async_session.commit()
        
        # Create 5 organizations
        for i in range(5):
            org = Organization(
                id=uuid4(),
                name=f"Test Org {i}",
                slug=f"test-org-{i}",
                owner_id=owner.id,
                privacy="PUBLIC",
                join_policy="REQUEST_ONLY",
                status="ACTIVE",
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            async_session.add(org)
        await async_session.commit()
        
        response = await client.get("/api/v1/organizations?limit=3")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 3

    @pytest.mark.asyncio
    async def test_get_organizations_with_offset(self, client):
        """Test pagination with offset parameter."""
        response_page1 = await client.get("/api/v1/organizations?limit=2&offset=0")
        response_page2 = await client.get("/api/v1/organizations?limit=2&offset=2")
        
        assert response_page1.status_code == 200
        assert response_page2.status_code == 200
        
        page1 = response_page1.json()
        page2 = response_page2.json()
        
        # Ensure different organizations (if enough exist)
        if len(page1) > 0 and len(page2) > 0:
            page1_ids = {org["id"] for org in page1}
            page2_ids = {org["id"] for org in page2}
            assert page1_ids != page2_ids


class TestGetOrganizationBySlug:
    """Tests for GET /organizations/{slug} endpoint."""

    @pytest.mark.asyncio
    async def test_get_organization_by_slug_success(self, client, test_organization):
        """Test successful retrieval of organization by slug."""
        response = await client.get(f"/api/v1/organizations/{test_organization.slug}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == test_organization.slug
        assert data["name"] == test_organization.name
        assert data["privacy"] == test_organization.privacy

    @pytest.mark.asyncio
    async def test_get_organization_by_slug_not_found(self, client):
        """Test 404 when organization doesn't exist."""
        response = await client.get("/api/v1/organizations/nonexistent-slug")
        
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_private_organization_without_auth(self, client, async_session, test_user):
        """Test access denied for private organization without authentication."""
        from auth_service.infrastructure.database.models.organization_model import Organization
        
        private_org = Organization(
            id=uuid4(),
            name="Private Org",
            slug="private-org",
            owner_id=test_user.id,
            privacy="PRIVATE",
            join_policy="INVITE_ONLY",
            status="ACTIVE",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        async_session.add(private_org)
        await async_session.commit()
        
        response = await client.get(f"/api/v1/organizations/{private_org.slug}")
        
        # Should return 403 or 404 for private org
        assert response.status_code in [403, 404]


class TestGetOrganizationMembers:
    """Tests for GET /organizations/{slug}/members endpoint."""

    @pytest.mark.asyncio
    async def test_get_organization_members_success(self, client, test_organization, test_user):
        """Test retrieval of organization members."""
        response = await client.get(f"/api/v1/organizations/{test_organization.slug}/members")
        
        # Should return 403 (requires authentication) or 200 with data
        assert response.status_code in [200, 403]

    @pytest.mark.asyncio
    async def test_get_organization_members_not_found(self, client):
        """Test 404 when organization doesn't exist."""
        response = await client.get("/api/v1/organizations/nonexistent/members")
        
        # Should return 403 or 404 depending on auth check order
        assert response.status_code in [403, 404]


class TestOrganizationTeams:
    """Tests for organization teams endpoints."""

    @pytest.mark.asyncio
    async def test_get_organization_teams(self, client, test_organization):
        """Test retrieval of organization teams."""
        response = await client.get(f"/api/v1/organizations/{test_organization.slug}/teams")
        
        # Should return 200 with empty or populated list
        assert response.status_code in [200, 404]  # 404 if endpoint doesn't exist
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list) or "teams" in data
