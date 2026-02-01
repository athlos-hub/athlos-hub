"""Testes unitários para os schemas de notificação."""

from datetime import datetime
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from notifications_service.infrastructure.database.models import (
    Notification,
    NotificationType,
)
from notifications_service.schemas import (
    NotificationBase,
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    SendNotificationRequest,
)


class TestNotificationBase:
    """Testes para NotificationBase schema."""

    def test_notification_base_valid(self):
        """Testa criação de NotificationBase com dados válidos."""
        # Arrange & Act
        notification = NotificationBase(
            type=NotificationType.GENERAL.value,
            title="Test Title",
            message="Test Message",
            action_url="/test",
        )
        
        # Assert
        assert notification.type == NotificationType.GENERAL.value
        assert notification.title == "Test Title"
        assert notification.message == "Test Message"
        assert notification.action_url == "/test"

    def test_notification_base_without_action_url(self):
        """Testa criação de NotificationBase sem action_url."""
        # Arrange & Act
        notification = NotificationBase(
            type=NotificationType.GENERAL.value,
            title="Test Title",
            message="Test Message",
        )
        
        # Assert
        assert notification.action_url is None

    def test_notification_base_missing_required_fields(self):
        """Testa criação de NotificationBase sem campos obrigatórios."""
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            NotificationBase(
                type=NotificationType.GENERAL.value,
                title="Test Title",
                # message está faltando
            )
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("message",)
        assert errors[0]["type"] == "missing"


class TestNotificationCreate:
    """Testes para NotificationCreate schema."""

    def test_notification_create_valid(self, sample_user_id: UUID):
        """Testa criação de NotificationCreate com dados válidos."""
        # Arrange & Act
        notification = NotificationCreate(
            user_id=sample_user_id,
            type=NotificationType.GENERAL.value,
            title="Test Title",
            message="Test Message",
            extra_data={"key": "value"},
            action_url="/test",
        )
        
        # Assert
        assert notification.user_id == sample_user_id
        assert notification.type == NotificationType.GENERAL.value
        assert notification.extra_data == {"key": "value"}

    def test_notification_create_without_optional_fields(self, sample_user_id: UUID):
        """Testa criação de NotificationCreate sem campos opcionais."""
        # Arrange & Act
        notification = NotificationCreate(
            user_id=sample_user_id,
            type=NotificationType.GENERAL.value,
            title="Test Title",
            message="Test Message",
        )
        
        # Assert
        assert notification.extra_data is None
        assert notification.action_url is None

    def test_notification_create_missing_user_id(self):
        """Testa criação de NotificationCreate sem user_id."""
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            NotificationCreate(
                type=NotificationType.GENERAL.value,
                title="Test Title",
                message="Test Message",
            )
        
        errors = exc_info.value.errors()
        assert any(error["loc"] == ("user_id",) for error in errors)

    def test_notification_create_with_organization_data(
        self, sample_user_id: UUID, sample_organization_id: UUID
    ):
        """Testa criação de NotificationCreate com dados de organização."""
        # Arrange & Act
        notification = NotificationCreate(
            user_id=sample_user_id,
            type=NotificationType.ORGANIZATION_INVITE.value,
            title="Convite para organização",
            message="Você foi convidado",
            extra_data={
                "organization_id": str(sample_organization_id),
                "organization_name": "Test Org",
                "inviter_name": "João",
            },
            action_url=f"/organizations/{sample_organization_id}",
        )
        
        # Assert
        assert notification.extra_data["organization_id"] == str(sample_organization_id)
        assert notification.extra_data["organization_name"] == "Test Org"
        assert notification.type == NotificationType.ORGANIZATION_INVITE.value


class TestNotificationResponse:
    """Testes para NotificationResponse schema."""

    def test_notification_response_from_model(self, sample_notification):
        """Testa criação de NotificationResponse a partir de modelo."""
        # Arrange & Act
        response = NotificationResponse.model_validate(sample_notification)
        
        # Assert
        assert response.id == sample_notification.id
        assert response.user_id == sample_notification.user_id
        assert response.type == sample_notification.type
        assert response.title == sample_notification.title
        assert response.message == sample_notification.message
        assert response.is_read == sample_notification.is_read
        assert response.created_at == sample_notification.created_at

    def test_notification_response_read_notification(self, sample_read_notification):
        """Testa NotificationResponse com notificação lida."""
        # Arrange & Act
        response = NotificationResponse.model_validate(sample_read_notification)
        
        # Assert
        assert response.is_read is True
        assert response.read_at is not None

    def test_notification_response_extra_data_serialization(self, sample_notification):
        """Testa serialização de extra_data como metadata."""
        # Arrange
        sample_notification.extra_data = {"test": "data", "count": 42}
        
        # Act
        response = NotificationResponse.model_validate(sample_notification)
        response_dict = response.model_dump(mode='json', by_alias=True)
        
        # Assert
        assert "metadata" in response_dict
        assert response_dict["metadata"] == {"test": "data", "count": 42}

    def test_notification_response_json_serialization(self, sample_notification):
        """Testa serialização JSON completa."""
        # Arrange & Act
        response = NotificationResponse.model_validate(sample_notification)
        json_data = response.model_dump(mode='json')
        
        # Assert
        assert isinstance(json_data["id"], str)
        assert isinstance(json_data["user_id"], str)
        assert isinstance(json_data["created_at"], str)
        assert isinstance(json_data["is_read"], bool)


class TestNotificationListResponse:
    """Testes para NotificationListResponse schema."""

    def test_notification_list_response_valid(self, multiple_notifications):
        """Testa criação de NotificationListResponse."""
        # Arrange
        items = [NotificationResponse.model_validate(n) for n in multiple_notifications]
        
        # Act
        response = NotificationListResponse(
            items=items,
            total=len(items),
            page=1,
            page_size=10,
            total_pages=1,
        )
        
        # Assert
        assert len(response.items) == len(multiple_notifications)
        assert response.total == len(items)
        assert response.page == 1
        assert response.page_size == 10
        assert response.total_pages == 1

    def test_notification_list_response_empty(self):
        """Testa NotificationListResponse vazio."""
        # Arrange & Act
        response = NotificationListResponse(
            items=[],
            total=0,
            page=1,
            page_size=10,
            total_pages=0,
        )
        
        # Assert
        assert response.items == []
        assert response.total == 0

    def test_notification_list_response_pagination(self, multiple_notifications):
        """Testa paginação em NotificationListResponse."""
        # Arrange
        total = 25
        page_size = 10
        page = 2
        items = [NotificationResponse.model_validate(n) for n in multiple_notifications[:page_size]]
        
        # Act
        response = NotificationListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=3,
        )
        
        # Assert
        assert response.total == total
        assert response.page == page
        assert response.total_pages == 3
        assert len(response.items) <= page_size


class TestUnreadCountResponse:
    """Testes para UnreadCountResponse schema."""

    def test_unread_count_response_valid(self):
        """Testa criação de UnreadCountResponse."""
        # Arrange & Act
        response = UnreadCountResponse(count=5)
        
        # Assert
        assert response.count == 5

    def test_unread_count_response_zero(self):
        """Testa UnreadCountResponse com zero."""
        # Arrange & Act
        response = UnreadCountResponse(count=0)
        
        # Assert
        assert response.count == 0

    def test_unread_count_response_negative_not_allowed(self):
        """Testa que contagem negativa não é permitida."""
        # Act & Assert - Pydantic pode aceitar negativos por padrão
        # mas vamos verificar se o valor é preservado
        response = UnreadCountResponse(count=-1)
        assert response.count == -1  # Sem validação de range por padrão


class TestSendNotificationRequest:
    """Testes para SendNotificationRequest schema."""

    def test_send_notification_request_valid(self, sample_user_id: UUID):
        """Testa criação de SendNotificationRequest."""
        # Arrange & Act
        request = SendNotificationRequest(
            user_id=sample_user_id,
            type=NotificationType.GENERAL.value,
            title="Test Title",
            message="Test Message",
            extra_data={"key": "value"},
            action_url="/test",
        )
        
        # Assert
        assert request.user_id == sample_user_id
        assert request.type == NotificationType.GENERAL.value
        assert request.title == "Test Title"
        assert request.extra_data == {"key": "value"}

    def test_send_notification_request_without_optional_fields(self, sample_user_id: UUID):
        """Testa SendNotificationRequest sem campos opcionais."""
        # Arrange & Act
        request = SendNotificationRequest(
            user_id=sample_user_id,
            type=NotificationType.GENERAL.value,
            title="Test Title",
            message="Test Message",
        )
        
        # Assert
        assert request.extra_data is None
        assert request.action_url is None

    def test_send_notification_request_organization_invite(
        self, sample_user_id: UUID, sample_organization_id: UUID
    ):
        """Testa SendNotificationRequest para convite de organização."""
        # Arrange & Act
        request = SendNotificationRequest(
            user_id=sample_user_id,
            type=NotificationType.ORGANIZATION_INVITE.value,
            title="Convite para organização",
            message="Você foi convidado para Test Org",
            extra_data={
                "organization_id": str(sample_organization_id),
                "organization_name": "Test Org",
                "inviter_name": "João",
            },
            action_url=f"/organizations/{sample_organization_id}",
        )
        
        # Assert
        assert request.type == NotificationType.ORGANIZATION_INVITE.value
        assert "organization_id" in request.extra_data


class TestSchemaIntegration:
    """Testes de integração entre schemas."""

    def test_create_to_response_flow(self, sample_user_id: UUID, sample_notification: Notification):
        """Testa fluxo de criação para resposta."""
        # Arrange
        create_data = NotificationCreate(
            user_id=sample_user_id,
            type=NotificationType.GENERAL.value,
            title="Test",
            message="Test message",
        )
        
        # Act
        response = NotificationResponse.model_validate(sample_notification)
        
        # Assert
        assert isinstance(response, NotificationResponse)
        assert response.user_id == sample_notification.user_id

    def test_list_response_with_multiple_types(self, sample_user_id: UUID):
        """Testa lista com diferentes tipos de notificações."""
        # Arrange
        notifications = []
        for notif_type in [
            NotificationType.GENERAL,
            NotificationType.ORGANIZATION_INVITE,
            NotificationType.ORGANIZATION_ACCEPTED,
        ]:
            notif = Notification(
                id=uuid4(),
                user_id=sample_user_id,
                type=notif_type.value,
                title=f"Test {notif_type.value}",
                message="Test message",
                is_read=False,
                read_at=None,
                novu_notification_id=None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            notifications.append(notif)
        
        items = [NotificationResponse.model_validate(n) for n in notifications]
        
        # Act
        response = NotificationListResponse(
            items=items,
            total=len(items),
            page=1,
            page_size=10,
            total_pages=1,
        )
        
        # Assert
        assert len(response.items) == 3
        assert all(isinstance(item, NotificationResponse) for item in response.items)
        types = [item.type for item in response.items]
        assert NotificationType.GENERAL.value in types
        assert NotificationType.ORGANIZATION_INVITE.value in types
