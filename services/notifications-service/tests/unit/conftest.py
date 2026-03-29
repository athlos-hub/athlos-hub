"""Configuração de fixtures para testes unitários."""

import os
from datetime import datetime
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

# Configurar variáveis de ambiente antes de importar as dependências
os.environ.setdefault("ENV", "dev")
os.environ.setdefault("NOVU_API_KEY", "test-api-key")
os.environ.setdefault("NOVU_APP_ID", "test-app-id")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("DATABASE_NAME", "test")
os.environ.setdefault("DATABASE_USER", "test")
os.environ.setdefault("DATABASE_PASSWORD", "test")

from notifications_service.domain.interfaces.repositories import INotificationRepository
from notifications_service.infrastructure.database.models import Notification, NotificationType


@pytest.fixture
def sample_user_id() -> UUID:
    """Fixture de ID de usuário de exemplo."""
    return UUID("12345678-1234-1234-1234-123456789012")


@pytest.fixture
def sample_notification_id() -> UUID:
    """Fixture de ID de notificação de exemplo."""
    return UUID("87654321-4321-4321-4321-210987654321")


@pytest.fixture
def sample_organization_id() -> UUID:
    """Fixture de ID de organização de exemplo."""
    return UUID("11111111-2222-3333-4444-555555555555")


@pytest.fixture
def sample_notification(sample_notification_id: UUID, sample_user_id: UUID) -> Notification:
    """Fixture de notificação de exemplo."""
    return Notification(
        id=sample_notification_id,
        user_id=sample_user_id,
        type=NotificationType.GENERAL.value,
        title="Test Notification",
        message="This is a test notification",
        extra_data={"test": "data"},
        action_url="/test",
        is_read=False,
        read_at=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


@pytest.fixture
def sample_read_notification(sample_notification: Notification) -> Notification:
    """Fixture de notificação lida de exemplo."""
    notification = Notification(
        id=uuid4(),
        user_id=sample_notification.user_id,
        type=sample_notification.type,
        title=sample_notification.title,
        message=sample_notification.message,
        extra_data=sample_notification.extra_data,
        action_url=sample_notification.action_url,
        is_read=True,
        read_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    return notification


@pytest.fixture
def mock_async_session() -> AsyncMock:
    """Mock de AsyncSession do SQLAlchemy."""
    session = AsyncMock(spec=AsyncSession)
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    session.delete = AsyncMock()
    return session


@pytest.fixture
def mock_notification_repository(
    mock_async_session: AsyncMock,
) -> AsyncMock:
    """Mock do repositório de notificações."""
    repo = AsyncMock(spec=INotificationRepository)
    repo.session = mock_async_session
    
    # Configurar métodos comuns
    repo.create = AsyncMock()
    repo.get_by_id = AsyncMock()
    repo.get_by_user = AsyncMock()
    repo.mark_as_read = AsyncMock()
    repo.mark_all_as_read = AsyncMock()
    repo.count_unread = AsyncMock()
    repo.delete = AsyncMock()
    repo.delete_all_by_user = AsyncMock()
    
    return repo


@pytest.fixture
def mock_novu_client() -> MagicMock:
    """Mock do cliente Novu."""
    client = MagicMock()
    client.send_notification = AsyncMock(return_value="novu-notification-id-123")
    return client


@pytest.fixture
def mock_sse_manager() -> MagicMock:
    """Mock do SSE manager."""
    manager = MagicMock()
    manager.send_notification = AsyncMock()
    manager.send_unread_count_update = AsyncMock()
    return manager


@pytest.fixture
def multiple_notifications(sample_user_id: UUID) -> list[Notification]:
    """Fixture com múltiplas notificações."""
    notifications = []
    for i in range(5):
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
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        notifications.append(notification)
    return notifications
