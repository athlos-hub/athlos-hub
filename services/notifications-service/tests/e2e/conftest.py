"""
Configuração de fixtures para testes E2E com banco de dados real (PostgreSQL).

Estes testes requerem:
- PostgreSQL rodando
- Variáveis de ambiente configuradas (ou usará valores padrão para teste)

Para rodar localmente:
    docker run -d --name postgres-test -p 5432:5432 \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=notifications_test \
        postgres:15
    
    TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/notifications_test \
        pytest tests/e2e/ -v
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
os.environ.setdefault("NOVU_API_KEY", "test-api-key")
os.environ.setdefault("NOVU_APP_ID", "test-app-id")
os.environ.setdefault("NOTIFICATIONS_DATABASE_SCHEMA", "")  # Sem schema para testes

# URL do banco de dados real para testes E2E
# Aceita TEST_DATABASE_URL, E2E_DATABASE_URL ou DATABASE_URL (nessa ordem de prioridade)
E2E_DATABASE_URL = (
    os.environ.get("TEST_DATABASE_URL") or
    os.environ.get("E2E_DATABASE_URL") or
    os.environ.get("DATABASE_URL") or
    "postgresql+asyncpg://postgres:postgres@localhost:5432/notifications_test"
)

from database.base import Base
from database.dependencies import get_session
from notifications_service.infrastructure.database.models import Notification, NotificationType
from notifications_service.main import app


# ============================================================================
# Configuração do Engine - Criado por função para evitar problemas de event loop
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
        # Limpa apenas os dados, não dropa as tabelas
        await conn.execute(text("TRUNCATE TABLE notifications CASCADE"))
    
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
async def test_client(async_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Cria um cliente de teste HTTP conectado ao banco real.
    """
    async def override_get_session():
        yield async_session
    
    app.dependency_overrides[get_session] = override_get_session
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()


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


@pytest.fixture
def sample_organization_id() -> UUID:
    """ID de organização para testes."""
    return UUID("11111111-2222-3333-4444-555555555555")


@pytest.fixture
def auth_headers(sample_user_id: UUID) -> dict:
    """Headers de autenticação com o user_id de teste."""
    return {"X-User-Id": str(sample_user_id)}


@pytest.fixture
def another_user_auth_headers(another_user_id: UUID) -> dict:
    """Headers de autenticação para outro usuário."""
    return {"X-User-Id": str(another_user_id)}


@pytest_asyncio.fixture
async def sample_notification(
    async_session: AsyncSession,
    sample_user_id: UUID,
) -> Notification:
    """Cria uma notificação de teste no banco PostgreSQL."""
    notification = Notification(
        id=uuid4(),
        user_id=sample_user_id,
        type=NotificationType.GENERAL,
        title="Test Notification",
        message="This is a test notification",
        is_read=False,
        extra_data={"test_key": "test_value"},
        action_url="/test/action",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    async_session.add(notification)
    await async_session.commit()
    await async_session.refresh(notification)
    return notification


@pytest_asyncio.fixture
async def read_notification(
    async_session: AsyncSession,
    sample_user_id: UUID,
) -> Notification:
    """Cria uma notificação já lida no banco PostgreSQL."""
    notification = Notification(
        id=uuid4(),
        user_id=sample_user_id,
        type=NotificationType.GENERAL,
        title="Read Notification",
        message="This notification was already read",
        is_read=True,
        read_at=datetime.now(UTC),
        extra_data={},
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    async_session.add(notification)
    await async_session.commit()
    await async_session.refresh(notification)
    return notification


@pytest_asyncio.fixture
async def multiple_notifications(
    async_session: AsyncSession,
    sample_user_id: UUID,
) -> list[Notification]:
    """
    Cria múltiplas notificações para testes de paginação.
    Retorna 15 notificações (alternando entre lidas/não lidas).
    """
    notifications = []
    for i in range(15):
        notification = Notification(
            id=uuid4(),
            user_id=sample_user_id,
            type=NotificationType.GENERAL if i % 2 == 0 else NotificationType.ORGANIZATION_INVITE,
            title=f"Notification {i + 1}",
            message=f"Test notification message {i + 1}",
            is_read=i % 2 == 0,  # Pares são lidas
            read_at=datetime.now(UTC) if i % 2 == 0 else None,
            extra_data={"index": i},
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        async_session.add(notification)
        notifications.append(notification)
    
    await async_session.commit()
    
    for notification in notifications:
        await async_session.refresh(notification)
    
    return notifications


@pytest_asyncio.fixture
async def another_user_notification(
    async_session: AsyncSession,
    another_user_id: UUID,
) -> Notification:
    """Cria uma notificação para outro usuário (teste de isolamento)."""
    notification = Notification(
        id=uuid4(),
        user_id=another_user_id,
        type=NotificationType.GENERAL,
        title="Another User Notification",
        message="This belongs to another user",
        is_read=False,
        extra_data={},
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    async_session.add(notification)
    await async_session.commit()
    await async_session.refresh(notification)
    return notification
