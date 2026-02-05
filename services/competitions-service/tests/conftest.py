import pytest
import pytest_asyncio
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv

# Load test environment variables
test_env_path = Path(__file__).parent.parent / ".env.test"
if test_env_path.exists():
    load_dotenv(test_env_path)

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
    from unittest.mock import AsyncMock, patch
    from src.routes.routes import get_current_user
    from src.api.deps import get_current_keycloak_id
    
    app = create_app()

    # OVERRIDE: Diz ao FastAPI para usar nossa sessão de teste em vez da real
    app.dependency_overrides[get_session] = lambda: session
    
    # OVERRIDE: Mock do usuário autenticado
    async def mock_get_current_user():
        return {
            "sub": "test-user-123",
            "email": "test@example.com",
            "preferred_username": "testuser",
            "realm_access": {"roles": ["user", "admin"]},
        }
    
    # OVERRIDE: Mock do keycloak_id
    async def mock_get_current_keycloak_id():
        return UUID("00000000-0000-0000-0000-000000000001")
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_keycloak_id] = mock_get_current_keycloak_id

    # Mock do AuthClient para não fazer chamadas reais ao auth-service
    # Precisamos mockar em todos os lugares onde é importado
    mock_auth_client = AsyncMock()
    mock_auth_client.__aenter__.return_value = mock_auth_client
    mock_auth_client.__aexit__.return_value = None
    mock_auth_client.check_user_permission = AsyncMock(return_value=None)
    mock_auth_client.check_organization_exists = AsyncMock(return_value={"exists": True})
    mock_auth_client.validate_organization_members = AsyncMock(return_value=None)
    
    with patch('src.api.deps.AuthClient', return_value=mock_auth_client), \
         patch('src.services.modality_service.AuthClient', return_value=mock_auth_client), \
         patch('src.services.teams_service.AuthClient', return_value=mock_auth_client), \
         patch('src.routes.matches_routes.AuthClient', return_value=mock_auth_client), \
         patch('src.routes.competitions_routes.AuthClient', return_value=mock_auth_client), \
         patch('src.routes.team_routes.AuthClient', return_value=mock_auth_client):
        
        # Cria o cliente async
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client