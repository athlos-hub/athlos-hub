"""
Configuração de fixtures do pytest para testes de integração do auth-service.

Este módulo fornece:
- Fixtures de banco de dados (engine, session)
- Factories para criação de objetos de teste
- Clientes HTTP para testes (autenticados e não autenticados)
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch
from typing import AsyncGenerator, Callable

from src.core.app import create_app
from src.models.base import Base
from src.models.user import User
from src.models.organization import Organization
from src.models.enums import OrganizationPrivacy
from database.dependencies import get_session

from .factories import UserFactory, OrganizationFactory, OrganizationMemberFactory


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(name="engine")
async def engine_fixture():
    """Cria o engine de banco de dados para testes."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    await engine.dispose()


@pytest_asyncio.fixture(name="session")
async def session_fixture(engine) -> AsyncGenerator[AsyncSession, None]:
    """Cria uma sessão de banco de dados isolada para cada teste."""
    TestingSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    
    async with TestingSessionLocal() as session:
        UserFactory._counter = 0
        OrganizationFactory._counter = 0
        yield session


@pytest.fixture(name="user_factory")
def user_factory_fixture(session: AsyncSession) -> Callable:
    """
    Factory fixture para criar usuários.
    
    Uso nos testes:
        async def test_something(user_factory):
            user = await user_factory()  # Cria usuário padrão
            user2 = await user_factory(email="custom@test.com")  # Com email customizado
            unverified = await user_factory(email_verified=False, enabled=False)
    """
    async def _factory(**kwargs) -> User:
        return await UserFactory.create(session, **kwargs)
    
    return _factory


@pytest.fixture(name="organization_factory")
def organization_factory_fixture(session: AsyncSession) -> Callable:
    """
    Factory fixture para criar organizações.
    
    Uso nos testes:
        async def test_something(organization_factory, user_factory):
            owner = await user_factory()
            org = await organization_factory(owner=owner)
            private_org = await organization_factory(owner=owner, privacy=OrganizationPrivacy.PRIVATE)
    """
    async def _factory(owner: User, **kwargs) -> Organization:
        return await OrganizationFactory.create(session, owner, **kwargs)
    
    return _factory


@pytest.fixture(name="member_factory")
def member_factory_fixture(session: AsyncSession) -> Callable:
    """
    Factory fixture para criar membros de organização.
    
    Uso nos testes:
        async def test_something(member_factory, organization_factory, user_factory):
            owner = await user_factory()
            org = await organization_factory(owner=owner)
            new_user = await user_factory()
            member = await member_factory(organization=org, user=new_user)
    """
    async def _factory(organization: Organization, user: User, **kwargs):
        return await OrganizationMemberFactory.create(session, organization, user, **kwargs)
    
    return _factory


@pytest_asyncio.fixture(name="test_user")
async def test_user_fixture(session: AsyncSession) -> User:
    """Cria um usuário verificado padrão para testes."""
    return await UserFactory.create_verified(
        session,
        email="test@example.com",
        username="testuser",
        first_name="Test",
        last_name="User",
    )


@pytest_asyncio.fixture(name="unverified_user")
async def unverified_user_fixture(session: AsyncSession) -> User:
    """Cria um usuário não verificado para testes."""
    return await UserFactory.create_unverified(
        session,
        email="unverified@example.com",
        username="unverifieduser",
        first_name="Unverified",
        last_name="User",
    )


@pytest_asyncio.fixture(name="admin_user")
async def admin_user_fixture(session: AsyncSession) -> User:
    """Cria um usuário admin para testes."""
    return await UserFactory.create_verified(
        session,
        email="admin@example.com",
        username="adminuser",
        first_name="Admin",
        last_name="User",
    )


@pytest_asyncio.fixture(name="test_organization")
async def test_organization_fixture(session: AsyncSession, test_user: User) -> Organization:
    """Cria uma organização de teste com o test_user como dono."""
    return await OrganizationFactory.create_public(
        session,
        owner=test_user,
        name="Test Organization",
        slug="test-organization",
        description="Uma organização de teste",
    )


@pytest_asyncio.fixture(name="client")
async def client_fixture(session: AsyncSession):
    """Cria um cliente HTTP de teste sem autenticação."""
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client


@pytest_asyncio.fixture(name="authenticated_client")
async def authenticated_client_fixture(session: AsyncSession, test_user: User):
    """
    Cria um cliente autenticado para testes.
    
    Faz o override do AuthService.get_current_db_user para retornar
    o test_user diretamente, sem validar tokens.
    """
    from src.services.auth_service import AuthService
    
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    
    async def get_test_user():
        return test_user
    
    app.dependency_overrides[AuthService.get_current_db_user] = get_test_user
    
    with patch('src.middlewares.auth_middleware.KeycloakAuthMiddleware._is_public_path', return_value=True):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            headers={"Authorization": "Bearer mock-valid-token"}
        ) as client:
            yield client


@pytest.fixture(name="make_authenticated_client")
def make_authenticated_client_fixture(session: AsyncSession):
    """
    Factory fixture para criar clientes autenticados com qualquer usuário.
    
    Uso nos testes:
        async def test_something(make_authenticated_client, user_factory):
            user = await user_factory()
            async with make_authenticated_client(user) as client:
                response = await client.get("/some-endpoint")
    """
    from contextlib import asynccontextmanager
    from src.services.auth_service import AuthService
    
    @asynccontextmanager
    async def _make_client(user: User):
        app = create_app()
        app.dependency_overrides[get_session] = lambda: session
        
        async def get_user():
            return user
        
        app.dependency_overrides[AuthService.get_current_db_user] = get_user
        
        with patch('src.middlewares.auth_middleware.KeycloakAuthMiddleware._is_public_path', return_value=True):
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
                headers={"Authorization": "Bearer mock-token"}
            ) as client:
                yield client
    
    return _make_client


@pytest_asyncio.fixture(name="admin_authenticated_client")
async def admin_authenticated_client_fixture(session: AsyncSession, admin_user: User):
    """Cria um cliente autenticado como admin para testes."""
    from src.services.auth_service import AuthService
    
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    
    async def get_admin_user():
        return admin_user
    
    app.dependency_overrides[AuthService.get_current_db_user] = get_admin_user
    
    with patch('src.middlewares.auth_middleware.KeycloakAuthMiddleware._is_public_path', return_value=True):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            headers={"Authorization": "Bearer mock-admin-token"}
        ) as client:
            yield client


def generate_mock_token_payload(user: User, roles: list[str] = None) -> dict:
    """Gera um payload de token JWT mockado baseado em um usuário."""
    return {
        "sub": user.keycloak_id,
        "email": user.email,
        "preferred_username": user.username,
        "given_name": user.first_name,
        "family_name": user.last_name,
        "email_verified": user.email_verified,
        "realm_access": {
            "roles": roles or ["player"]
        }
    }
