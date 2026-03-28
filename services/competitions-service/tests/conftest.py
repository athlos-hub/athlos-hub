import os
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from dotenv import load_dotenv
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Load test environment variables
test_env_path = Path(__file__).parent.parent / ".env.test"
if test_env_path.exists():
    load_dotenv(test_env_path)

os.environ.setdefault("ENV", "dev")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("DATABASE_NAME", "competitions_test")
os.environ.setdefault("DATABASE_USER", "test")
os.environ.setdefault("DATABASE_PASSWORD", "test")

from src.core.app import create_app
from src.models.base import Base
from src.routes.routes import get_session

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture(name="session")
async def session_fixture() -> AsyncSession:
    """
    Cria uma sessão de banco de dados isolada para cada teste.
    """
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool, # Mantém dados em memória
    )
    
    # Cria as tabelas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Fábrica de sessões
    TestingSessionLocal = sessionmaker(
        bind=engine, 
        class_=AsyncSession, 
        expire_on_commit=False
    )

    async with TestingSessionLocal() as session:
        yield session

    # Limpeza após o teste
    await engine.dispose()

@pytest_asyncio.fixture(name="client")
async def client_fixture(session: AsyncSession):
    """
    Cria um cliente HTTP (simula o navegador/Postman) e
    injeta a sessão de teste no lugar da sessão real.
    """
    from uuid import UUID

    from src.api.deps import get_current_keycloak_id
    from src.routes.routes import get_current_user

    mock_auth_client = AsyncMock()
    mock_auth_client.__aenter__.return_value = mock_auth_client
    mock_auth_client.__aexit__.return_value = None
    mock_auth_client.check_user_permission = AsyncMock(return_value=None)
    mock_auth_client.check_organization_exists = AsyncMock(return_value={"exists": True})
    mock_auth_client.validate_organization_members = AsyncMock(return_value=None)

    with patch("src.core.app.db.init", lambda **kwargs: None), \
         patch("src.core.app.db.check_health", new_callable=AsyncMock), \
         patch("src.core.app.db.close", new_callable=AsyncMock), \
         patch("src.api.deps.AuthClient", return_value=mock_auth_client), \
         patch("src.services.modality_service.AuthClient", return_value=mock_auth_client), \
         patch("src.services.teams_service.AuthClient", return_value=mock_auth_client), \
         patch("src.routes.matches_routes.AuthClient", return_value=mock_auth_client), \
         patch("src.routes.competitions_routes.AuthClient", return_value=mock_auth_client), \
         patch("src.routes.team_routes.AuthClient", return_value=mock_auth_client):
        app = create_app()

        app.dependency_overrides[get_session] = lambda: session

        async def mock_get_current_user():
            return {
                "sub": "test-user-123",
                "email": "test@example.com",
                "preferred_username": "testuser",
                "realm_access": {"roles": ["user", "admin"]},
            }

        async def mock_get_current_keycloak_id():
            return UUID("00000000-0000-0000-0000-000000000001")

        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_current_keycloak_id] = mock_get_current_keycloak_id

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client