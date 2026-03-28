"""Pytest configuration and shared fixtures for auth-service tests."""

import os

# Configurar variáveis de ambiente necessárias antes de qualquer importação
os.environ.setdefault("ENV", "dev")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/callback")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("DATABASE_NAME", "test_db")
os.environ.setdefault("DATABASE_USER", "test")
os.environ.setdefault("DATABASE_PASSWORD", "test")
os.environ.setdefault("KEYCLOAK_DATABASE_URL", "postgresql://test:test@localhost:5432/keycloak")
os.environ.setdefault("KEYCLOAK_DATABASE_USER", "test")
os.environ.setdefault("KEYCLOAK_DATABASE_PASSWORD", "test")
os.environ.setdefault("EMAIL_TOKEN_SECRET", "test-email-token-secret")
os.environ.setdefault("RESEND_API_KEY", "test-resend-api-key")
os.environ.setdefault("AWS_BUCKET_REGION", "us-east-1")
os.environ.setdefault("AWS_BUCKET_NAME", "test-bucket")
os.environ.setdefault("AWS_BUCKET_ACCESS_KEY_ID", "test-access-key")
os.environ.setdefault("AWS_BUCKET_SECRET_ACCESS_KEY", "test-secret-key")

import asyncio
from datetime import datetime
from typing import AsyncGenerator
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, MagicMock, patch

from auth_service.infrastructure.database.dependencies import get_session
from auth_service.core.app import create_app
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


# Integration test fixtures

@pytest_asyncio.fixture
async def test_app(async_session):
    """Create a test FastAPI application."""
    app = create_app()
    
    async def override_get_session():
        yield async_session
    
    app.dependency_overrides[get_session] = override_get_session
    return app


@pytest_asyncio.fixture
async def client(test_app):
    """Create an async HTTP client for testing."""
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user(async_session):
    """Create a test user in the database."""
    user = User(
        id=uuid4(),
        keycloak_id=str(uuid4()),
        email="testuser@example.com",
        username="testuser",
        first_name="Test",
        last_name="User",
        enabled=True,
        email_verified=True,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_organization(async_session, test_user):
    """Create a test organization in the database."""
    org = Organization(
        id=uuid4(),
        name="Test Organization",
        slug="test-organization",
        description="A test organization",
        owner_id=test_user.id,
        privacy="PUBLIC",
        join_policy="REQUEST_ONLY",
        status="ACTIVE",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    async_session.add(org)
    
    # Add owner as member
    member = OrganizationMember(
        id=uuid4(),
        organization_id=org.id,
        user_id=test_user.id,
        status="ACTIVE",
    )
    async_session.add(member)
    
    await async_session.commit()
    await async_session.refresh(org)
    return org


@pytest_asyncio.fixture
async def authenticated_client(client, test_user):
    """Create an authenticated HTTP client with Bearer token."""
    from auth_service.services.authentication_service import AuthenticationService
    
    # Generate a valid test token
    token = AuthenticationService.generate_email_token(str(test_user.keycloak_id))
    
    # Add authorization header
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client

