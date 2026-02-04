"""Testes unitários para o NotificationService."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest

from notifications_service.core.exceptions import (
    NotificationAccessDeniedException,
    NotificationNotFoundException,
)
from notifications_service.domain.services.notification_service import NotificationService
from notifications_service.infrastructure.database.models import Notification, NotificationType
from notifications_service.schemas import NotificationCreate, NotificationResponse


class TestNotificationServiceCreate:
    """Testes para criação de notificações."""

    @pytest.mark.asyncio
    async def test_create_notification_success(
        self,
        mock_notification_repository: AsyncMock,
        mock_novu_client: MagicMock,
        mock_sse_manager: MagicMock,
        sample_user_id: UUID,
        sample_notification: Notification,
    ):
        """Testa criação bem-sucedida de notificação."""
        # Arrange
        mock_notification_repository.create.return_value = sample_notification
        mock_notification_repository.count_unread.return_value = 5
        
        with patch("notifications_service.domain.services.notification_service.novu_client", mock_novu_client), \
             patch("notifications_service.domain.services.notification_service.sse_manager", mock_sse_manager):
            
            service = NotificationService(mock_notification_repository)
            
            notification_data = NotificationCreate(
                user_id=sample_user_id,
                type=NotificationType.GENERAL.value,
                title="Test Notification",
                message="This is a test",
                extra_data={"test": "data"},
                action_url="/test",
            )
            
            # Act
            result = await service.create_notification(notification_data)
            
            # Assert
            assert isinstance(result, NotificationResponse)
            assert result.id == sample_notification.id
            assert result.user_id == sample_user_id
            assert result.title == "Test Notification"
            
            mock_notification_repository.create.assert_called_once()
            mock_novu_client.send_notification.assert_called_once()
            mock_sse_manager.send_notification.assert_called_once()
            mock_sse_manager.send_unread_count_update.assert_called_once_with(sample_user_id, 5)

    @pytest.mark.asyncio
    async def test_create_notification_without_novu(
        self,
        mock_notification_repository: AsyncMock,
        mock_novu_client: MagicMock,
        mock_sse_manager: MagicMock,
        sample_user_id: UUID,
        sample_notification: Notification,
    ):
        """Testa criação de notificação sem enviar para Novu."""
        # Arrange
        mock_notification_repository.create.return_value = sample_notification
        mock_notification_repository.count_unread.return_value = 3
        
        with patch("notifications_service.domain.services.notification_service.novu_client", mock_novu_client), \
             patch("notifications_service.domain.services.notification_service.sse_manager", mock_sse_manager):
            
            service = NotificationService(mock_notification_repository)
            
            notification_data = NotificationCreate(
                user_id=sample_user_id,
                type=NotificationType.GENERAL.value,
                title="Test Notification",
                message="This is a test",
            )
            
            # Act
            result = await service.create_notification(notification_data, send_to_novu=False)
            
            # Assert
            assert isinstance(result, NotificationResponse)
            mock_notification_repository.create.assert_called_once()
            mock_novu_client.send_notification.assert_not_called()
            mock_sse_manager.send_notification.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_notification_novu_failure(
        self,
        mock_notification_repository: AsyncMock,
        mock_novu_client: MagicMock,
        mock_sse_manager: MagicMock,
        sample_user_id: UUID,
        sample_notification: Notification,
    ):
        """Testa criação de notificação quando Novu falha."""
        # Arrange
        mock_notification_repository.create.return_value = sample_notification
        mock_notification_repository.count_unread.return_value = 1
        mock_novu_client.send_notification.side_effect = Exception("Novu error")
        
        with patch("notifications_service.domain.services.notification_service.novu_client", mock_novu_client), \
             patch("notifications_service.domain.services.notification_service.sse_manager", mock_sse_manager):
            
            service = NotificationService(mock_notification_repository)
            
            notification_data = NotificationCreate(
                user_id=sample_user_id,
                type=NotificationType.GENERAL.value,
                title="Test Notification",
                message="This is a test",
            )
            
            # Act - não deve lançar exceção mesmo com Novu falhando
            result = await service.create_notification(notification_data)
            
            # Assert
            assert isinstance(result, NotificationResponse)
            mock_notification_repository.create.assert_called_once()
            mock_sse_manager.send_notification.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_notification_sse_failure(
        self,
        mock_notification_repository: AsyncMock,
        mock_novu_client: MagicMock,
        mock_sse_manager: MagicMock,
        sample_user_id: UUID,
        sample_notification: Notification,
    ):
        """Testa criação de notificação quando SSE falha."""
        # Arrange
        mock_notification_repository.create.return_value = sample_notification
        mock_sse_manager.send_notification.side_effect = Exception("SSE error")
        
        with patch("notifications_service.domain.services.notification_service.novu_client", mock_novu_client), \
             patch("notifications_service.domain.services.notification_service.sse_manager", mock_sse_manager):
            
            service = NotificationService(mock_notification_repository)
            
            notification_data = NotificationCreate(
                user_id=sample_user_id,
                type=NotificationType.GENERAL.value,
                title="Test Notification",
                message="This is a test",
            )
            
            # Act - não deve lançar exceção mesmo com SSE falhando
            result = await service.create_notification(notification_data)
            
            # Assert
            assert isinstance(result, NotificationResponse)
            mock_notification_repository.create.assert_called_once()


class TestNotificationServiceGet:
    """Testes para busca de notificações."""

    @pytest.mark.asyncio
    async def test_get_notification_success(
        self,
        mock_notification_repository: AsyncMock,
        sample_user_id: UUID,
        sample_notification_id: UUID,
        sample_notification: Notification,
    ):
        """Testa busca bem-sucedida de notificação."""
        # Arrange
        mock_notification_repository.get_by_id.return_value = sample_notification
        service = NotificationService(mock_notification_repository)
        
        # Act
        result = await service.get_notification(sample_notification_id, sample_user_id)
        
        # Assert
        assert isinstance(result, NotificationResponse)
        assert result.id == sample_notification_id
        assert result.user_id == sample_user_id
        mock_notification_repository.get_by_id.assert_called_once_with(sample_notification_id)

    @pytest.mark.asyncio
    async def test_get_notification_not_found(
        self,
        mock_notification_repository: AsyncMock,
        sample_user_id: UUID,
        sample_notification_id: UUID,
    ):
        """Testa busca de notificação que não existe."""
        # Arrange
        mock_notification_repository.get_by_id.return_value = None
        service = NotificationService(mock_notification_repository)
        
        # Act & Assert
        with pytest.raises(NotificationNotFoundException):
            await service.get_notification(sample_notification_id, sample_user_id)

    @pytest.mark.asyncio
    async def test_get_notification_access_denied(
        self,
        mock_notification_repository: AsyncMock,
        sample_notification: Notification,
    ):
        """Testa busca de notificação de outro usuário."""
        # Arrange
        mock_notification_repository.get_by_id.return_value = sample_notification
        service = NotificationService(mock_notification_repository)
        
        different_user_id = uuid4()
        
        # Act & Assert
        with pytest.raises(NotificationAccessDeniedException):
            await service.get_notification(sample_notification.id, different_user_id)

    @pytest.mark.asyncio
    async def test_list_user_notifications_success(
        self,
        mock_notification_repository: AsyncMock,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa listagem de notificações do usuário."""
        # Arrange
        mock_notification_repository.get_by_user.return_value = (multiple_notifications, len(multiple_notifications))
        service = NotificationService(mock_notification_repository)
        
        # Act
        result = await service.list_user_notifications(sample_user_id, page=1, page_size=10)
        
        # Assert
        assert len(result.items) == len(multiple_notifications)
        assert result.total == len(multiple_notifications)
        assert result.page == 1
        assert result.page_size == 10
        assert result.total_pages == 1
        mock_notification_repository.get_by_user.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_user_notifications_unread_only(
        self,
        mock_notification_repository: AsyncMock,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa listagem de apenas notificações não lidas."""
        # Arrange
        unread_notifications = [n for n in multiple_notifications if not n.is_read]
        mock_notification_repository.get_by_user.return_value = (unread_notifications, len(unread_notifications))
        service = NotificationService(mock_notification_repository)
        
        # Act
        result = await service.list_user_notifications(sample_user_id, unread_only=True)
        
        # Assert
        assert all(not item.is_read for item in result.items)
        mock_notification_repository.get_by_user.assert_called_once_with(
            user_id=sample_user_id,
            skip=0,
            limit=50,
            unread_only=True,
        )

    @pytest.mark.asyncio
    async def test_list_user_notifications_pagination(
        self,
        mock_notification_repository: AsyncMock,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa paginação de notificações."""
        # Arrange
        total = 25
        page_size = 10
        page = 2
        mock_notification_repository.get_by_user.return_value = (multiple_notifications[:page_size], total)
        service = NotificationService(mock_notification_repository)
        
        # Act
        result = await service.list_user_notifications(sample_user_id, page=page, page_size=page_size)
        
        # Assert
        assert result.page == page
        assert result.page_size == page_size
        assert result.total == total
        assert result.total_pages == 3  # 25 / 10 = 2.5 -> 3
        mock_notification_repository.get_by_user.assert_called_once_with(
            user_id=sample_user_id,
            skip=10,  # (page - 1) * page_size
            limit=page_size,
            unread_only=False,
        )


class TestNotificationServiceMarkAsRead:
    """Testes para marcar notificações como lidas."""

    @pytest.mark.asyncio
    async def test_mark_as_read_success(
        self,
        mock_notification_repository: AsyncMock,
        mock_sse_manager: MagicMock,
        sample_user_id: UUID,
        sample_notification_id: UUID,
        sample_notification: Notification,
        sample_read_notification: Notification,
    ):
        """Testa marcar notificação como lida."""
        # Arrange
        mock_notification_repository.get_by_id.return_value = sample_notification
        mock_notification_repository.mark_as_read.return_value = sample_read_notification
        mock_notification_repository.count_unread.return_value = 2
        
        with patch("notifications_service.domain.services.notification_service.sse_manager", mock_sse_manager):
            service = NotificationService(mock_notification_repository)
            
            # Act
            result = await service.mark_as_read(sample_notification_id, sample_user_id)
            
            # Assert
            assert isinstance(result, NotificationResponse)
            mock_notification_repository.mark_as_read.assert_called_once_with(sample_notification_id)
            mock_sse_manager.send_notification.assert_called_once()
            mock_sse_manager.send_unread_count_update.assert_called_once_with(sample_user_id, 2)

    @pytest.mark.asyncio
    async def test_mark_as_read_not_found(
        self,
        mock_notification_repository: AsyncMock,
        sample_user_id: UUID,
        sample_notification_id: UUID,
    ):
        """Testa marcar como lida notificação que não existe."""
        # Arrange
        mock_notification_repository.get_by_id.return_value = None
        service = NotificationService(mock_notification_repository)
        
        # Act & Assert
        with pytest.raises(NotificationNotFoundException):
            await service.mark_as_read(sample_notification_id, sample_user_id)

    @pytest.mark.asyncio
    async def test_mark_as_read_access_denied(
        self,
        mock_notification_repository: AsyncMock,
        sample_notification: Notification,
    ):
        """Testa marcar como lida notificação de outro usuário."""
        # Arrange
        mock_notification_repository.get_by_id.return_value = sample_notification
        service = NotificationService(mock_notification_repository)
        
        different_user_id = uuid4()
        
        # Act & Assert
        with pytest.raises(NotificationAccessDeniedException):
            await service.mark_as_read(sample_notification.id, different_user_id)

    @pytest.mark.asyncio
    async def test_mark_all_as_read_success(
        self,
        mock_notification_repository: AsyncMock,
        mock_sse_manager: MagicMock,
        sample_user_id: UUID,
    ):
        """Testa marcar todas as notificações como lidas."""
        # Arrange
        mock_notification_repository.mark_all_as_read.return_value = 5
        mock_notification_repository.count_unread.return_value = 0
        
        with patch("notifications_service.domain.services.notification_service.sse_manager", mock_sse_manager):
            service = NotificationService(mock_notification_repository)
            
            # Act
            result = await service.mark_all_as_read(sample_user_id)
            
            # Assert
            assert result == 5
            mock_notification_repository.mark_all_as_read.assert_called_once_with(sample_user_id)
            mock_sse_manager.send_unread_count_update.assert_called_once_with(sample_user_id, 0)


class TestNotificationServiceCount:
    """Testes para contagem de notificações."""

    @pytest.mark.asyncio
    async def test_count_unread_success(
        self,
        mock_notification_repository: AsyncMock,
        sample_user_id: UUID,
    ):
        """Testa contagem de notificações não lidas."""
        # Arrange
        mock_notification_repository.count_unread.return_value = 7
        service = NotificationService(mock_notification_repository)
        
        # Act
        result = await service.count_unread(sample_user_id)
        
        # Assert
        assert result == 7
        mock_notification_repository.count_unread.assert_called_once_with(sample_user_id)


class TestNotificationServiceDelete:
    """Testes para deleção de notificações."""

    @pytest.mark.asyncio
    async def test_delete_notification_success(
        self,
        mock_notification_repository: AsyncMock,
        mock_sse_manager: MagicMock,
        sample_user_id: UUID,
        sample_notification_id: UUID,
        sample_notification: Notification,
    ):
        """Testa deleção bem-sucedida de notificação."""
        # Arrange
        mock_notification_repository.get_by_id.return_value = sample_notification
        mock_notification_repository.count_unread.return_value = 3
        
        with patch("notifications_service.domain.services.notification_service.sse_manager", mock_sse_manager):
            service = NotificationService(mock_notification_repository)
            
            # Act
            await service.delete_notification(sample_notification_id, sample_user_id)
            
            # Assert
            mock_notification_repository.delete.assert_called_once_with(sample_notification)
            mock_notification_repository.session.commit.assert_called_once()
            mock_sse_manager.send_unread_count_update.assert_called_once_with(sample_user_id, 3)

    @pytest.mark.asyncio
    async def test_delete_notification_not_found(
        self,
        mock_notification_repository: AsyncMock,
        sample_user_id: UUID,
        sample_notification_id: UUID,
    ):
        """Testa deleção de notificação que não existe."""
        # Arrange
        mock_notification_repository.get_by_id.return_value = None
        service = NotificationService(mock_notification_repository)
        
        # Act & Assert
        with pytest.raises(NotificationNotFoundException):
            await service.delete_notification(sample_notification_id, sample_user_id)

    @pytest.mark.asyncio
    async def test_delete_notification_access_denied(
        self,
        mock_notification_repository: AsyncMock,
        sample_notification: Notification,
    ):
        """Testa deleção de notificação de outro usuário."""
        # Arrange
        mock_notification_repository.get_by_id.return_value = sample_notification
        service = NotificationService(mock_notification_repository)
        
        different_user_id = uuid4()
        
        # Act & Assert
        with pytest.raises(NotificationAccessDeniedException):
            await service.delete_notification(sample_notification.id, different_user_id)

    @pytest.mark.asyncio
    async def test_clear_all_notifications_success(
        self,
        mock_notification_repository: AsyncMock,
        mock_sse_manager: MagicMock,
        sample_user_id: UUID,
    ):
        """Testa limpeza de todas as notificações do usuário."""
        # Arrange
        mock_notification_repository.delete_all_by_user.return_value = 10
        mock_notification_repository.count_unread.return_value = 0
        
        with patch("notifications_service.domain.services.notification_service.sse_manager", mock_sse_manager):
            service = NotificationService(mock_notification_repository)
            
            # Act
            result = await service.clear_all_notifications(sample_user_id)
            
            # Assert
            assert result == 10
            mock_notification_repository.delete_all_by_user.assert_called_once_with(sample_user_id)
            mock_notification_repository.session.commit.assert_called_once()
            mock_sse_manager.send_unread_count_update.assert_called_once_with(sample_user_id, 0)


class TestNotificationServiceOrganization:
    """Testes para notificações relacionadas a organizações."""

    @pytest.mark.asyncio
    async def test_send_organization_invite(
        self,
        mock_notification_repository: AsyncMock,
        mock_novu_client: MagicMock,
        mock_sse_manager: MagicMock,
        sample_user_id: UUID,
        sample_organization_id: UUID,
    ):
        """Testa envio de convite para organização."""
        # Arrange
        notification = Notification(
            id=uuid4(),
            user_id=sample_user_id,
            type=NotificationType.ORGANIZATION_INVITE.value,
            title="Convite para organização",
            message="João convidou você para participar de Test Org",
            extra_data={
                "organization_id": str(sample_organization_id),
                "organization_name": "Test Org",
                "inviter_name": "João",
            },
            action_url=f"/organizations/{sample_organization_id}",
            is_read=False,
            read_at=None,
            novu_notification_id=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        mock_notification_repository.create.return_value = notification
        mock_notification_repository.count_unread.return_value = 1
        
        with patch("notifications_service.domain.services.notification_service.novu_client", mock_novu_client), \
             patch("notifications_service.domain.services.notification_service.sse_manager", mock_sse_manager):
            
            service = NotificationService(mock_notification_repository)
            
            # Act
            result = await service.send_organization_invite(
                user_id=sample_user_id,
                organization_name="Test Org",
                organization_id=sample_organization_id,
                inviter_name="João",
            )
            
            # Assert
            assert isinstance(result, NotificationResponse)
            assert result.type == NotificationType.ORGANIZATION_INVITE.value
            assert "Test Org" in result.message
            assert "João" in result.message
            mock_notification_repository.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_organization_accepted(
        self,
        mock_notification_repository: AsyncMock,
        mock_novu_client: MagicMock,
        mock_sse_manager: MagicMock,
        sample_user_id: UUID,
        sample_organization_id: UUID,
    ):
        """Testa envio de notificação de convite aceito."""
        # Arrange
        notification = Notification(
            id=uuid4(),
            user_id=sample_user_id,
            type=NotificationType.ORGANIZATION_ACCEPTED.value,
            title="Convite aceito",
            message="Maria aceitou o convite para Test Org",
            extra_data={
                "organization_id": str(sample_organization_id),
                "organization_name": "Test Org",
                "member_name": "Maria",
            },
            action_url=f"/organizations/{sample_organization_id}/members",
            is_read=False,
            read_at=None,
            novu_notification_id=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        mock_notification_repository.create.return_value = notification
        mock_notification_repository.count_unread.return_value = 1
        
        with patch("notifications_service.domain.services.notification_service.novu_client", mock_novu_client), \
             patch("notifications_service.domain.services.notification_service.sse_manager", mock_sse_manager):
            
            service = NotificationService(mock_notification_repository)
            
            # Act
            result = await service.send_organization_accepted(
                user_id=sample_user_id,
                organization_name="Test Org",
                organization_id=sample_organization_id,
                member_name="Maria",
            )
            
            # Assert
            assert isinstance(result, NotificationResponse)
            assert result.type == NotificationType.ORGANIZATION_ACCEPTED.value
            assert "Maria" in result.message
            assert "Test Org" in result.message
            mock_notification_repository.create.assert_called_once()
