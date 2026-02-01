"""Testes de integração para os endpoints de notificações."""

from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient

from notifications_service.infrastructure.database.models import Notification, NotificationType


class TestListNotifications:
    """Testes para listagem de notificações."""

    @pytest.mark.asyncio
    async def test_list_notifications_empty(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
    ):
        """Testa listagem quando não há notificações."""
        # Act
        response = await test_client.get(
            "/api/v1/notifications",
            params={"user_id": str(sample_user_id)}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
        assert data["page"] == 1
        assert data["page_size"] == 50

    @pytest.mark.asyncio
    async def test_list_notifications_with_data(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa listagem com notificações existentes."""
        # Act
        response = await test_client.get(
            "/api/v1/notifications",
            params={"user_id": str(sample_user_id)}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == len(multiple_notifications)
        assert len(data["items"]) == len(multiple_notifications)
        assert data["page"] == 1

    @pytest.mark.asyncio
    async def test_list_notifications_with_pagination(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa listagem com paginação."""
        # Act
        response = await test_client.get(
            "/api/v1/notifications",
            params={
                "user_id": str(sample_user_id),
                "page": 1,
                "page_size": 5,
            }
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == len(multiple_notifications)
        assert len(data["items"]) == 5
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert data["total_pages"] == 2

    @pytest.mark.asyncio
    async def test_list_notifications_unread_only(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa listagem de apenas notificações não lidas."""
        # Arrange
        unread_count = sum(1 for n in multiple_notifications if not n.is_read)
        
        # Act
        response = await test_client.get(
            "/api/v1/notifications",
            params={
                "user_id": str(sample_user_id),
                "unread_only": True,
            }
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == unread_count
        assert len(data["items"]) == unread_count
        assert all(not item["is_read"] for item in data["items"])

    @pytest.mark.asyncio
    async def test_list_notifications_invalid_page(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
    ):
        """Testa listagem com página inválida."""
        # Act
        response = await test_client.get(
            "/api/v1/notifications",
            params={
                "user_id": str(sample_user_id),
                "page": 0,  # Inválido
            }
        )
        
        # Assert
        assert response.status_code == 422  # Validation error


class TestGetUnreadCount:
    """Testes para contagem de notificações não lidas."""

    @pytest.mark.asyncio
    async def test_unread_count_zero(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
    ):
        """Testa contagem quando não há notificações."""
        # Act
        response = await test_client.get(
            "/api/v1/notifications/unread-count",
            params={"user_id": str(sample_user_id)}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0

    @pytest.mark.asyncio
    async def test_unread_count_with_notifications(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """Testa contagem com notificações existentes."""
        # Arrange
        expected_count = sum(1 for n in multiple_notifications if not n.is_read)
        
        # Act
        response = await test_client.get(
            "/api/v1/notifications/unread-count",
            params={"user_id": str(sample_user_id)}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == expected_count


class TestGetNotification:
    """Testes para obter notificação específica."""

    @pytest.mark.asyncio
    async def test_get_notification_success(
        self,
        test_client: AsyncClient,
        sample_notification: Notification,
        auth_headers: dict,
    ):
        """Testa obter notificação existente."""
        # Act
        response = await test_client.get(
            f"/api/v1/notifications/{sample_notification.id}",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_notification.id)
        assert data["title"] == sample_notification.title
        assert data["message"] == sample_notification.message
        assert data["is_read"] == sample_notification.is_read

    @pytest.mark.asyncio
    async def test_get_notification_not_found(
        self,
        test_client: AsyncClient,
        auth_headers: dict,
    ):
        """Testa obter notificação que não existe."""
        # Act
        response = await test_client.get(
            f"/api/v1/notifications/{uuid4()}",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_notification_access_denied(
        self,
        test_client: AsyncClient,
        another_user_notification: Notification,
        auth_headers: dict,
    ):
        """Testa obter notificação de outro usuário."""
        # Act
        response = await test_client.get(
            f"/api/v1/notifications/{another_user_notification.id}",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_notification_no_auth(
        self,
        test_client: AsyncClient,
        sample_notification: Notification,
    ):
        """Testa obter notificação sem autenticação."""
        # Act
        response = await test_client.get(
            f"/api/v1/notifications/{sample_notification.id}",
        )
        
        # Assert
        assert response.status_code == 401


class TestMarkAsRead:
    """Testes para marcar notificações como lidas."""

    @pytest.mark.asyncio
    async def test_mark_as_read_success(
        self,
        test_client: AsyncClient,
        sample_notification: Notification,
        auth_headers: dict,
    ):
        """Testa marcar notificação como lida."""
        # Act
        response = await test_client.post(
            f"/api/v1/notifications/{sample_notification.id}/mark-read",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_notification.id)
        assert data["is_read"] is True
        assert data["read_at"] is not None

    @pytest.mark.asyncio
    async def test_mark_as_read_not_found(
        self,
        test_client: AsyncClient,
        auth_headers: dict,
    ):
        """Testa marcar como lida notificação que não existe."""
        # Act
        response = await test_client.post(
            f"/api/v1/notifications/{uuid4()}/mark-read",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_mark_as_read_access_denied(
        self,
        test_client: AsyncClient,
        another_user_notification: Notification,
        auth_headers: dict,
    ):
        """Testa marcar como lida notificação de outro usuário."""
        # Act
        response = await test_client.post(
            f"/api/v1/notifications/{another_user_notification.id}/mark-read",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_mark_all_as_read_success(
        self,
        test_client: AsyncClient,
        multiple_notifications: list[Notification],
        auth_headers: dict,
    ):
        """Testa marcar todas as notificações como lidas."""
        # Arrange
        unread_count = sum(1 for n in multiple_notifications if not n.is_read)
        
        # Act
        response = await test_client.post(
            "/api/v1/notifications/mark-all-read",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert unread_count > 0  # Garante que havia não lidas
        assert f"{unread_count}" in data["message"]

    @pytest.mark.asyncio
    async def test_mark_all_as_read_no_unread(
        self,
        test_client: AsyncClient,
        sample_read_notification: Notification,
        auth_headers: dict,
    ):
        """Testa marcar todas como lidas quando não há não lidas."""
        # Act
        response = await test_client.post(
            "/api/v1/notifications/mark-all-read",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "0" in data["message"]


class TestDeleteNotification:
    """Testes para deleção de notificações."""

    @pytest.mark.asyncio
    async def test_delete_notification_success(
        self,
        test_client: AsyncClient,
        sample_notification: Notification,
        auth_headers: dict,
    ):
        """Testa deletar notificação."""
        # Act
        response = await test_client.delete(
            f"/api/v1/notifications/{sample_notification.id}",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 204
        
        # Verificar que foi deletada
        get_response = await test_client.get(
            f"/api/v1/notifications/{sample_notification.id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_notification_not_found(
        self,
        test_client: AsyncClient,
        auth_headers: dict,
    ):
        """Testa deletar notificação que não existe."""
        # Act
        response = await test_client.delete(
            f"/api/v1/notifications/{uuid4()}",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_notification_access_denied(
        self,
        test_client: AsyncClient,
        another_user_notification: Notification,
        auth_headers: dict,
    ):
        """Testa deletar notificação de outro usuário."""
        # Act
        response = await test_client.delete(
            f"/api/v1/notifications/{another_user_notification.id}",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_clear_all_notifications_success(
        self,
        test_client: AsyncClient,
        multiple_notifications: list[Notification],
        auth_headers: dict,
    ):
        """Testa limpar todas as notificações."""
        # Act
        response = await test_client.delete(
            "/api/v1/notifications/clear-all",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert str(len(multiple_notifications)) in data["message"]
        
        # Verificar que foram deletadas
        list_response = await test_client.get(
            "/api/v1/notifications",
            params={"user_id": str(multiple_notifications[0].user_id)}
        )
        assert list_response.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_clear_all_notifications_empty(
        self,
        test_client: AsyncClient,
        auth_headers: dict,
    ):
        """Testa limpar quando não há notificações."""
        # Act
        response = await test_client.delete(
            "/api/v1/notifications/clear-all",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "0" in data["message"]


class TestSendNotification:
    """Testes para envio de notificações."""

    @pytest.mark.asyncio
    async def test_send_notification_success(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
    ):
        """Testa enviar notificação."""
        # Arrange
        payload = {
            "user_id": str(sample_user_id),
            "type": NotificationType.GENERAL.value,
            "title": "New Notification",
            "message": "This is a new notification",
            "extra_data": {"key": "value"},
            "action_url": "/action",
        }
        
        # Act
        response = await test_client.post(
            "/api/v1/notifications/send",
            json=payload,
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Notification"
        assert data["message"] == "This is a new notification"
        assert data["user_id"] == str(sample_user_id)
        assert data["is_read"] is False

    @pytest.mark.asyncio
    async def test_send_notification_minimal(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
    ):
        """Testa enviar notificação com dados mínimos."""
        # Arrange
        payload = {
            "user_id": str(sample_user_id),
            "type": NotificationType.GENERAL.value,
            "title": "Minimal Notification",
            "message": "Minimal message",
        }
        
        # Act
        response = await test_client.post(
            "/api/v1/notifications/send",
            json=payload,
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Minimal Notification"
        assert data["action_url"] is None

    @pytest.mark.asyncio
    async def test_send_notification_invalid_data(
        self,
        test_client: AsyncClient,
    ):
        """Testa enviar notificação com dados inválidos."""
        # Arrange
        payload = {
            "type": NotificationType.GENERAL.value,
            "title": "Invalid",
            # Falta user_id e message
        }
        
        # Act
        response = await test_client.post(
            "/api/v1/notifications/send",
            json=payload,
        )
        
        # Assert
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_send_organization_invite(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        sample_organization_id: UUID,
    ):
        """Testa enviar convite para organização."""
        # Arrange
        payload = {
            "user_id": str(sample_user_id),
            "type": NotificationType.ORGANIZATION_INVITE.value,
            "title": "Convite para organização",
            "message": "João convidou você para participar de Test Org",
            "extra_data": {
                "organization_id": str(sample_organization_id),
                "organization_name": "Test Org",
                "inviter_name": "João",
            },
            "action_url": f"/organizations/{sample_organization_id}",
        }
        
        # Act
        response = await test_client.post(
            "/api/v1/notifications/send",
            json=payload,
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == NotificationType.ORGANIZATION_INVITE.value
        assert "metadata" in data
        assert data["metadata"]["organization_id"] == str(sample_organization_id)


class TestIntegrationFlow:
    """Testes de fluxo completo de integração."""

    @pytest.mark.asyncio
    async def test_complete_notification_flow(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        auth_headers: dict,
    ):
        """Testa fluxo completo: criar, listar, marcar como lida, deletar."""
        # 1. Enviar notificação
        send_response = await test_client.post(
            "/api/v1/notifications/send",
            json={
                "user_id": str(sample_user_id),
                "type": NotificationType.GENERAL.value,
                "title": "Flow Test",
                "message": "Testing complete flow",
            }
        )
        assert send_response.status_code == 201
        notification_id = send_response.json()["id"]
        
        # 2. Verificar contagem de não lidas
        count_response = await test_client.get(
            "/api/v1/notifications/unread-count",
            params={"user_id": str(sample_user_id)}
        )
        assert count_response.json()["count"] == 1
        
        # 3. Listar notificações
        list_response = await test_client.get(
            "/api/v1/notifications",
            params={"user_id": str(sample_user_id)}
        )
        assert list_response.json()["total"] == 1
        
        # 4. Obter notificação específica
        get_response = await test_client.get(
            f"/api/v1/notifications/{notification_id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 200
        assert get_response.json()["is_read"] is False
        
        # 5. Marcar como lida
        mark_response = await test_client.post(
            f"/api/v1/notifications/{notification_id}/mark-read",
            headers=auth_headers,
        )
        assert mark_response.json()["is_read"] is True
        
        # 6. Verificar contagem após marcar como lida
        count_response2 = await test_client.get(
            "/api/v1/notifications/unread-count",
            params={"user_id": str(sample_user_id)}
        )
        assert count_response2.json()["count"] == 0
        
        # 7. Deletar notificação
        delete_response = await test_client.delete(
            f"/api/v1/notifications/{notification_id}",
            headers=auth_headers,
        )
        assert delete_response.status_code == 204
        
        # 8. Verificar que foi deletada
        list_response2 = await test_client.get(
            "/api/v1/notifications",
            params={"user_id": str(sample_user_id)}
        )
        assert list_response2.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_pagination_flow(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
    ):
        """Testa fluxo de paginação com múltiplas notificações."""
        # 1. Criar 25 notificações
        for i in range(25):
            await test_client.post(
                "/api/v1/notifications/send",
                json={
                    "user_id": str(sample_user_id),
                    "type": NotificationType.GENERAL.value,
                    "title": f"Pagination Test {i}",
                    "message": f"Message {i}",
                }
            )
        
        # 2. Buscar primeira página (10 itens)
        page1_response = await test_client.get(
            "/api/v1/notifications",
            params={
                "user_id": str(sample_user_id),
                "page": 1,
                "page_size": 10,
            }
        )
        page1_data = page1_response.json()
        assert len(page1_data["items"]) == 10
        assert page1_data["total"] == 25
        assert page1_data["total_pages"] == 3
        
        # 3. Buscar segunda página
        page2_response = await test_client.get(
            "/api/v1/notifications",
            params={
                "user_id": str(sample_user_id),
                "page": 2,
                "page_size": 10,
            }
        )
        page2_data = page2_response.json()
        assert len(page2_data["items"]) == 10
        
        # 4. Buscar terceira página
        page3_response = await test_client.get(
            "/api/v1/notifications",
            params={
                "user_id": str(sample_user_id),
                "page": 3,
                "page_size": 10,
            }
        )
        page3_data = page3_response.json()
        assert len(page3_data["items"]) == 5  # Restantes
