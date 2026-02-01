"""Testes unitários para o NotificationRepository."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from notifications_service.infrastructure.database.models import Notification, NotificationType
from notifications_service.infrastructure.repositories.notification_repository import (
    NotificationRepository,
)


class TestNotificationRepositoryCreate:
    """Testes para criação de notificações no repositório."""

    @pytest.mark.asyncio
    async def test_create_notification(
        self,
        mock_async_session: AsyncMock,
        sample_notification: Notification,
    ):
        """Testa criação de notificação no banco."""
        # Arrange
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.create(sample_notification)
        
        # Assert
        mock_async_session.add.assert_called_once_with(sample_notification)
        mock_async_session.commit.assert_called_once()
        mock_async_session.refresh.assert_called_once_with(sample_notification)
        assert result == sample_notification


class TestNotificationRepositoryGetById:
    """Testes para busca de notificação por ID."""

    @pytest.mark.asyncio
    async def test_get_by_id_found(
        self,
        mock_async_session: AsyncMock,
        sample_notification: Notification,
        sample_notification_id: UUID,
    ):
        """Testa busca de notificação existente por ID."""
        # Arrange
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_notification
        mock_async_session.execute.return_value = mock_result
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.get_by_id(sample_notification_id)
        
        # Assert
        assert result == sample_notification
        mock_async_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(
        self,
        mock_async_session: AsyncMock,
        sample_notification_id: UUID,
    ):
        """Testa busca de notificação que não existe."""
        # Arrange
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_async_session.execute.return_value = mock_result
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.get_by_id(sample_notification_id)
        
        # Assert
        assert result is None
        mock_async_session.execute.assert_called_once()


class TestNotificationRepositoryGetByUser:
    """Testes para busca de notificações por usuário."""

    @pytest.mark.asyncio
    async def test_get_by_user_success(
        self,
        mock_async_session: AsyncMock,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa busca de notificações do usuário."""
        # Arrange
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = len(multiple_notifications)
        
        mock_query_result = MagicMock()
        mock_query_result.scalars.return_value.all.return_value = multiple_notifications
        
        mock_async_session.execute.side_effect = [mock_count_result, mock_query_result]
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        notifications, total = await repo.get_by_user(sample_user_id)
        
        # Assert
        assert notifications == multiple_notifications
        assert total == len(multiple_notifications)
        assert mock_async_session.execute.call_count == 2

    @pytest.mark.asyncio
    async def test_get_by_user_with_pagination(
        self,
        mock_async_session: AsyncMock,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa busca de notificações com paginação."""
        # Arrange
        skip = 5
        limit = 10
        total = 25
        
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = total
        
        mock_query_result = MagicMock()
        mock_query_result.scalars.return_value.all.return_value = multiple_notifications[:limit]
        
        mock_async_session.execute.side_effect = [mock_count_result, mock_query_result]
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        notifications, result_total = await repo.get_by_user(sample_user_id, skip=skip, limit=limit)
        
        # Assert
        assert len(notifications) <= limit
        assert result_total == total
        assert mock_async_session.execute.call_count == 2

    @pytest.mark.asyncio
    async def test_get_by_user_unread_only(
        self,
        mock_async_session: AsyncMock,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa busca de apenas notificações não lidas."""
        # Arrange
        unread_notifications = [n for n in multiple_notifications if not n.is_read]
        
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = len(unread_notifications)
        
        mock_query_result = MagicMock()
        mock_query_result.scalars.return_value.all.return_value = unread_notifications
        
        mock_async_session.execute.side_effect = [mock_count_result, mock_query_result]
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        notifications, total = await repo.get_by_user(sample_user_id, unread_only=True)
        
        # Assert
        assert notifications == unread_notifications
        assert total == len(unread_notifications)
        assert mock_async_session.execute.call_count == 2

    @pytest.mark.asyncio
    async def test_get_by_user_empty_result(
        self,
        mock_async_session: AsyncMock,
        sample_user_id: UUID,
    ):
        """Testa busca de notificações quando não há nenhuma."""
        # Arrange
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = 0
        
        mock_query_result = MagicMock()
        mock_query_result.scalars.return_value.all.return_value = []
        
        mock_async_session.execute.side_effect = [mock_count_result, mock_query_result]
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        notifications, total = await repo.get_by_user(sample_user_id)
        
        # Assert
        assert notifications == []
        assert total == 0


class TestNotificationRepositoryMarkAsRead:
    """Testes para marcar notificações como lidas."""

    @pytest.mark.asyncio
    async def test_mark_as_read_success(
        self,
        mock_async_session: AsyncMock,
        sample_notification: Notification,
        sample_notification_id: UUID,
    ):
        """Testa marcar notificação como lida."""
        # Arrange
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_notification
        mock_async_session.execute.return_value = mock_result
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.mark_as_read(sample_notification_id)
        
        # Assert
        assert result == sample_notification
        assert result.is_read is True
        assert result.read_at is not None
        mock_async_session.commit.assert_called_once()
        mock_async_session.refresh.assert_called_once_with(sample_notification)

    @pytest.mark.asyncio
    async def test_mark_as_read_not_found(
        self,
        mock_async_session: AsyncMock,
        sample_notification_id: UUID,
    ):
        """Testa marcar como lida notificação que não existe."""
        # Arrange
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_async_session.execute.return_value = mock_result
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.mark_as_read(sample_notification_id)
        
        # Assert
        assert result is None
        mock_async_session.commit.assert_not_called()


class TestNotificationRepositoryMarkAllAsRead:
    """Testes para marcar todas as notificações como lidas."""

    @pytest.mark.asyncio
    async def test_mark_all_as_read_success(
        self,
        mock_async_session: AsyncMock,
        sample_user_id: UUID,
    ):
        """Testa marcar todas as notificações do usuário como lidas."""
        # Arrange
        affected_rows = 5
        mock_result = MagicMock()
        mock_result.rowcount = affected_rows
        mock_async_session.execute.return_value = mock_result
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.mark_all_as_read(sample_user_id)
        
        # Assert
        assert result == affected_rows
        mock_async_session.execute.assert_called_once()
        mock_async_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_all_as_read_no_unread(
        self,
        mock_async_session: AsyncMock,
        sample_user_id: UUID,
    ):
        """Testa marcar todas como lidas quando não há não lidas."""
        # Arrange
        mock_result = MagicMock()
        mock_result.rowcount = 0
        mock_async_session.execute.return_value = mock_result
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.mark_all_as_read(sample_user_id)
        
        # Assert
        assert result == 0
        mock_async_session.commit.assert_called_once()


class TestNotificationRepositoryCountUnread:
    """Testes para contagem de notificações não lidas."""

    @pytest.mark.asyncio
    async def test_count_unread_with_notifications(
        self,
        mock_async_session: AsyncMock,
        sample_user_id: UUID,
    ):
        """Testa contagem de notificações não lidas."""
        # Arrange
        unread_count = 7
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = unread_count
        mock_async_session.execute.return_value = mock_result
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.count_unread(sample_user_id)
        
        # Assert
        assert result == unread_count
        mock_async_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_count_unread_no_notifications(
        self,
        mock_async_session: AsyncMock,
        sample_user_id: UUID,
    ):
        """Testa contagem quando não há notificações não lidas."""
        # Arrange
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 0
        mock_async_session.execute.return_value = mock_result
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.count_unread(sample_user_id)
        
        # Assert
        assert result == 0
        mock_async_session.execute.assert_called_once()


class TestNotificationRepositoryDelete:
    """Testes para deleção de notificações."""

    @pytest.mark.asyncio
    async def test_delete_notification(
        self,
        mock_async_session: AsyncMock,
        sample_notification: Notification,
    ):
        """Testa deleção de notificação."""
        # Arrange
        repo = NotificationRepository(mock_async_session)
        
        # Act
        await repo.delete(sample_notification)
        
        # Assert
        mock_async_session.delete.assert_called_once_with(sample_notification)

    @pytest.mark.asyncio
    async def test_delete_all_by_user_success(
        self,
        mock_async_session: AsyncMock,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa deleção de todas as notificações do usuário."""
        # Arrange
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = multiple_notifications
        mock_async_session.execute.return_value = mock_result
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.delete_all_by_user(sample_user_id)
        
        # Assert
        assert result == len(multiple_notifications)
        assert mock_async_session.delete.call_count == len(multiple_notifications)

    @pytest.mark.asyncio
    async def test_delete_all_by_user_no_notifications(
        self,
        mock_async_session: AsyncMock,
        sample_user_id: UUID,
    ):
        """Testa deleção quando usuário não tem notificações."""
        # Arrange
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_async_session.execute.return_value = mock_result
        
        repo = NotificationRepository(mock_async_session)
        
        # Act
        result = await repo.delete_all_by_user(sample_user_id)
        
        # Assert
        assert result == 0
        mock_async_session.delete.assert_not_called()
