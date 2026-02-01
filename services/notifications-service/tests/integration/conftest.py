"""Configuração de fixtures para testes de integração."""

import os
from datetime import datetime
from typing import AsyncGenerator
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Configurar variáveis de ambiente antes de importar as dependências
os.environ.setdefault("NOVU_API_KEY", "test-api-key")
os.environ.setdefault("NOVU_APP_ID", "test-app-id")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")

from database.base import Base
from database.dependencies import get_session
from notifications_service.infrastructure.database.models import Notification, NotificationType
from notifications_service.main import app


# URL do banco de dados de teste (SQLite em memória para testes)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Cria um event loop para toda a sessão de testes."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def async_engine():
    """Cria engine async para testes."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def async_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Cria uma sessão async para testes."""
    async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def test_client(async_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Cria um cliente de teste HTTP."""
    
    async def override_get_session():
        yield async_session
    
    app.dependency_overrides[get_session] = override_get_session
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_id() -> UUID:
    """Fixture de ID de usuário de exemplo."""
    return UUID("12345678-1234-1234-1234-123456789012")


@pytest.fixture
def another_user_id() -> UUID:
    """Fixture de outro ID de usuário."""
    return UUID("87654321-4321-4321-4321-210987654321")


@pytest.fixture
def sample_organization_id() -> UUID:
    """Fixture de ID de organização de exemplo."""
    return UUID("11111111-2222-3333-4444-555555555555")


@pytest_asyncio.fixture
async def sample_notification(
    async_session: AsyncSession,
    sample_user_id: UUID,
) -> Notification:
    """Cria uma notificação de teste no banco."""
    notification = Notification(
        id=uuid4(),
        user_id=sample_user_id,
        type=NotificationType.GENERAL.value,
        title="Test Notification",
        message="This is a test notification",
        extra_data={"test": "data"},
        action_url="/test",
        is_read=False,
        read_at=None,
        novu_notification_id=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    async_session.add(notification)
    await async_session.commit()
    await async_session.refresh(notification)
    
    return notification


@pytest_asyncio.fixture
async def sample_read_notification(
    async_session: AsyncSession,
    sample_user_id: UUID,
) -> Notification:
    """Cria uma notificação lida de teste no banco."""
    notification = Notification(
        id=uuid4(),
        user_id=sample_user_id,
        type=NotificationType.GENERAL.value,
        title="Read Notification",
        message="This notification is already read",
        extra_data={"test": "data"},
        action_url="/test",
        is_read=True,
        read_at=datetime.utcnow(),
        novu_notification_id=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
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
    """Cria múltiplas notificações de teste no banco."""
    notifications = []
    
    for i in range(10):
        notification = Notification(
            id=uuid4(),
            user_id=sample_user_id,
            type=NotificationType.GENERAL.value,
            title=f"Test Notification {i}",
            message=f"This is test notification {i}",
            extra_data={"index": i},
            action_url=f"/test/{i}",
            is_read=i % 2 == 0,  # Alterna entre lida e não lida
            read_at=datetime.utcnow() if i % 2 == 0 else None,
            novu_notification_id=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        notifications.append(notification)
    
    for notification in notifications:
        async_session.add(notification)
    
    await async_session.commit()
    
    for notification in notifications:
        await async_session.refresh(notification)
    
    return notifications


@pytest_asyncio.fixture
async def another_user_notification(
    async_session: AsyncSession,
    another_user_id: UUID,
) -> Notification:
    """Cria uma notificação de outro usuário."""
    notification = Notification(
        id=uuid4(),
        user_id=another_user_id,
        type=NotificationType.GENERAL.value,
        title="Another User Notification",
        message="This belongs to another user",
        extra_data={},
        action_url=None,
        is_read=False,
        read_at=None,
        novu_notification_id=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    async_session.add(notification)
    await async_session.commit()
    await async_session.refresh(notification)
    
    return notification


@pytest.fixture
def auth_headers(sample_user_id: UUID) -> dict:
    """Headers de autenticação para testes."""
    return {"X-User-Id": str(sample_user_id)}


@pytest.fixture
def another_user_auth_headers(another_user_id: UUID) -> dict:
    """Headers de autenticação para outro usuário."""
    return {"X-User-Id": str(another_user_id)}
