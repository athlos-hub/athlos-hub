"""Integration tests for user endpoints."""

import pytest
from uuid import uuid4


class TestGetUsersPublic:
    """Tests for GET /users/ endpoint."""

    @pytest.mark.asyncio
    async def test_get_users_public_returns_enabled_users(self, client, test_user):
        """Test that get users public returns only enabled users."""
        response = await client.get("/api/v1/users/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify test user is in the list
        user_emails = [user["email"] for user in data]
        assert test_user.email in user_emails

    @pytest.mark.asyncio
    async def test_get_users_public_empty_list(self, client, async_session):
        """Test that get users public returns empty list when no users."""
        # Clear all users
        from auth_service.infrastructure.database.models.user_model import User
        from auth_service.infrastructure.database.models.organization_model import OrganizationMember, Organization
        from sqlalchemy import delete
        
        # Clear members and organizations first (foreign key constraints)
        await async_session.execute(delete(OrganizationMember))
        await async_session.execute(delete(Organization))
        await async_session.execute(delete(User))
        await async_session.commit()
        
        response = await client.get("/api/v1/users/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0


class TestGetUserById:
    """Tests for GET /users/{user_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_user_by_id_success(self, client, test_user):
        """Test successful retrieval of user by ID."""
        response = await client.get(f"/api/v1/users/{test_user.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, client):
        """Test 404 when user ID doesn't exist."""
        non_existent_id = uuid4()
        response = await client.get(f"/api/v1/users/{non_existent_id}")
        
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_user_by_id_disabled_user(self, client, async_session):
        """Test 404 when user is disabled."""
        from auth_service.infrastructure.database.models.user_model import User
        from datetime import datetime
        
        disabled_user = User(
            id=uuid4(),
            keycloak_id=str(uuid4()),
            email="disabled@example.com",
            username="disabled",
            enabled=False,  # Disabled
            email_verified=True,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        async_session.add(disabled_user)
        await async_session.commit()
        
        response = await client.get(f"/api/v1/users/{disabled_user.id}")
        
        assert response.status_code == 404
