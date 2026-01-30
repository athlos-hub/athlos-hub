"""Pytest configuration and shared fixtures for auth-service tests."""

import asyncio
from datetime import datetime
from typing import AsyncGenerator
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, MagicMock, patch

from auth_service.infrastructure.database.base import Base
from auth_service.infrastructure.database.models.user_model import User
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationMember,
    OrganizationOrganizer,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def async_engine():
    """Create an in-memory SQLite database for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def async_session(async_engine):
    """Provide a transactional SQLAlchemy session for tests."""
    async_session_maker = sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )

    async with async_session_maker() as session:
        yield session


@pytest.fixture
def mock_user() -> User:
    """Create a mock user for testing."""
    return User(
        id=uuid4(),
        keycloak_id="keycloak-user-123",
        email="user@example.com",
        username="testuser",
        first_name="Test",
        last_name="User",
        avatar_url="https://example.com/avatar.jpg",
        enabled=True,
        email_verified=True,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        last_login_at=None,
    )


@pytest.fixture
def mock_organization(mock_user: User) -> Organization:
    """Create a mock organization for testing."""
    return Organization(
        id=uuid4(),
        name="Test Organization",
        slug="test-organization",
        description="A test organization",
        owner_id=mock_user.id,
        privacy="PUBLIC",
        join_policy="REQUEST_ONLY",
        status="ACTIVE",
        logo_url=None,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )


@pytest.fixture
def mock_user_repository():
    """Create a mock user repository."""
    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock()
    mock_repo.get_by_email = AsyncMock()
    mock_repo.get_by_keycloak_id = AsyncMock()
    mock_repo.get_all_enabled = AsyncMock()
    mock_repo.get_all = AsyncMock()
    mock_repo.create = AsyncMock()
    mock_repo.update = AsyncMock()
    mock_repo.suspend = AsyncMock()
    mock_repo.commit = AsyncMock()
    mock_repo.rollback = AsyncMock()
    return mock_repo


@pytest.fixture
def mock_organization_repository():
    """Create a mock organization repository."""
    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock()
    mock_repo.get_by_slug = AsyncMock()
    mock_repo.exists_by_slug = AsyncMock(return_value=False)
    mock_repo.get_all = AsyncMock()
    mock_repo.create = AsyncMock()
    mock_repo.update = AsyncMock()
    mock_repo.delete = AsyncMock()
    mock_repo.commit = AsyncMock()
    mock_repo.rollback = AsyncMock()
    return mock_repo


@pytest.fixture
def mock_organization_member_repository():
    """Create a mock organization member repository."""
    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock()
    mock_repo.get_by_organization_and_user = AsyncMock()
    mock_repo.get_by_organization = AsyncMock()
    mock_repo.create = AsyncMock()
    mock_repo.update = AsyncMock()
    mock_repo.delete = AsyncMock()
    mock_repo.commit = AsyncMock()
    return mock_repo


@pytest.fixture
def mock_organization_organizer_repository():
    """Create a mock organization organizer repository."""
    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock()
    mock_repo.get_by_organization_and_user = AsyncMock()
    mock_repo.get_by_organization = AsyncMock()
    mock_repo.create = AsyncMock()
    mock_repo.update = AsyncMock()
    mock_repo.delete = AsyncMock()
    mock_repo.commit = AsyncMock()
    return mock_repo


@pytest.fixture
def mock_keycloak_service():
    """Create a mock keycloak service."""
    mock_service = AsyncMock()
    mock_service.add_role = AsyncMock()
    mock_service.remove_role = AsyncMock()
    mock_service.get_user = AsyncMock()
    return mock_service
