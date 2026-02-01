"""
Configuração de fixtures para testes E2E com banco de dados real (PostgreSQL).

Estes testes requerem:
- PostgreSQL rodando
- Variáveis de ambiente configuradas

Para rodar localmente:
    docker run -d --name postgres-auth-test -p 5434:5432 \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=auth_test \
        postgres:15
    
    TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5434/auth_test \
        pytest tests/e2e/ -v --no-cov
"""

import os
from datetime import datetime, UTC
from typing import AsyncGenerator
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Configurar variáveis de ambiente ANTES de importar as dependências da aplicação
os.environ.setdefault("KEYCLOAK_URL", "http://localhost:8080")
os.environ.setdefault("KEYCLOAK_REALM", "sports")
os.environ.setdefault("KEYCLOAK_CLIENT_ID", "test-client")
os.environ.setdefault("KEYCLOAK_CLIENT_SECRET", "test-secret")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-e2e-tests")
os.environ.setdefault("EMAIL_TOKEN_SECRET", "test-email-token-secret")
os.environ.setdefault("AUTH_DATABASE_SCHEMA", "")  # Sem schema para testes

# URL do banco de dados real para testes E2E
E2E_DATABASE_URL = (
    os.environ.get("TEST_DATABASE_URL") or
    os.environ.get("E2E_DATABASE_URL") or
    os.environ.get("AUTH_DATABASE_URL") or
    "postgresql+asyncpg://postgres:postgres@localhost:5432/auth_test"
)

from database.dependencies import get_session
from auth_service.infrastructure.database.base import Base
from auth_service.infrastructure.database.models.user_model import User
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationMember,
    OrganizationOrganizer,
)
from auth_service.infrastructure.database.models.enums import (
    OrganizationPrivacy,
    OrganizationJoinPolicy,
    OrganizationStatus,
    MemberStatus,
)
from auth_service.core.app import create_app


# ============================================================================
# Configuração do Engine
# ============================================================================

def create_test_engine():
    """Cria uma nova instância do engine async."""
    return create_async_engine(
        E2E_DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )


@pytest_asyncio.fixture(scope="function")
async def async_engine():
    """
    Cria engine async para testes E2E conectando ao PostgreSQL real.
    Scope é 'function' para evitar problemas de event loop entre testes.
    """
    engine = create_test_engine()
    
    # Cria as tabelas no banco de dados
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Limpa as tabelas após o teste
    async with engine.begin() as conn:
        # Limpa dados na ordem correta (respeita FKs)
        await conn.execute(text("DELETE FROM organization_organizers"))
        await conn.execute(text("DELETE FROM organization_members"))
        await conn.execute(text("DELETE FROM organizations"))
        await conn.execute(text("DELETE FROM users"))
    
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def async_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Cria uma sessão async para cada teste.
    """
    async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def test_app(async_session: AsyncSession):
    """Cria a aplicação FastAPI para testes."""
    app = create_app()
    
    async def override_get_session():
        yield async_session
    
    app.dependency_overrides[get_session] = override_get_session
    
    yield app
    
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def test_client(test_app) -> AsyncGenerator[AsyncClient, None]:
    """
    Cria um cliente de teste HTTP conectado ao banco real.
    """
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ============================================================================
# Fixtures de dados de teste
# ============================================================================

@pytest.fixture
def sample_user_id() -> UUID:
    """ID de usuário para testes."""
    return UUID("12345678-1234-1234-1234-123456789012")


@pytest.fixture
def another_user_id() -> UUID:
    """Outro ID de usuário para testes de isolamento."""
    return UUID("87654321-4321-4321-4321-210987654321")


@pytest_asyncio.fixture
async def test_user(async_session: AsyncSession) -> User:
    """Cria um usuário de teste no banco PostgreSQL."""
    user = User(
        id=uuid4(),
        keycloak_id=str(uuid4()),
        email="e2e-test@example.com",
        username="e2e_test_user",
        first_name="E2E",
        last_name="Test",
        enabled=True,
        email_verified=True,
        avatar_url=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def another_user(async_session: AsyncSession) -> User:
    """Cria outro usuário de teste para cenários de isolamento."""
    user = User(
        id=uuid4(),
        keycloak_id=str(uuid4()),
        email="e2e-another@example.com",
        username="e2e_another_user",
        first_name="Another",
        last_name="User",
        enabled=True,
        email_verified=True,
        avatar_url=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_organization(
    async_session: AsyncSession,
    test_user: User,
) -> Organization:
    """Cria uma organização de teste no banco PostgreSQL."""
    org = Organization(
        id=uuid4(),
        name="E2E Test Organization",
        slug="e2e-test-organization",
        description="Organization for E2E testing",
        owner_id=test_user.id,
        privacy=OrganizationPrivacy.PUBLIC,
        join_policy=OrganizationJoinPolicy.REQUEST_ONLY,
        status=OrganizationStatus.ACTIVE,
        logo_url=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    async_session.add(org)
    
    # Adiciona owner como membro
    member = OrganizationMember(
        id=uuid4(),
        organization_id=org.id,
        user_id=test_user.id,
        status=MemberStatus.ACTIVE,
    )
    async_session.add(member)
    
    await async_session.commit()
    await async_session.refresh(org)
    return org


@pytest_asyncio.fixture
async def private_organization(
    async_session: AsyncSession,
    test_user: User,
) -> Organization:
    """Cria uma organização privada de teste."""
    org = Organization(
        id=uuid4(),
        name="Private E2E Organization",
        slug="private-e2e-organization",
        description="Private organization for E2E testing",
        owner_id=test_user.id,
        privacy=OrganizationPrivacy.PRIVATE,
        join_policy=OrganizationJoinPolicy.INVITE_ONLY,
        status=OrganizationStatus.ACTIVE,
        logo_url=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    async_session.add(org)
    
    # Adiciona owner como membro
    member = OrganizationMember(
        id=uuid4(),
        organization_id=org.id,
        user_id=test_user.id,
        status=MemberStatus.ACTIVE,
    )
    async_session.add(member)
    
    await async_session.commit()
    await async_session.refresh(org)
    return org


@pytest_asyncio.fixture
async def multiple_organizations(
    async_session: AsyncSession,
    test_user: User,
) -> list[Organization]:
    """Cria múltiplas organizações para testes de listagem."""
    organizations = []
    
    for i in range(5):
        org = Organization(
            id=uuid4(),
            name=f"E2E Organization {i + 1}",
            slug=f"e2e-organization-{i + 1}",
            description=f"Organization {i + 1} for E2E testing",
            owner_id=test_user.id,
            privacy=OrganizationPrivacy.PUBLIC if i % 2 == 0 else OrganizationPrivacy.PRIVATE,
            join_policy=OrganizationJoinPolicy.REQUEST_ONLY,
            status=OrganizationStatus.ACTIVE,
            logo_url=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        async_session.add(org)
        
        # Adiciona owner como membro
        member = OrganizationMember(
            id=uuid4(),
            organization_id=org.id,
            user_id=test_user.id,
            status=MemberStatus.ACTIVE,
        )
        async_session.add(member)
        
        organizations.append(org)
    
    await async_session.commit()
    
    for org in organizations:
        await async_session.refresh(org)
    
    return organizations
