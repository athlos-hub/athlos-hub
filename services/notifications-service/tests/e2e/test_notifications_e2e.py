"""Testes E2E para os endpoints de notificações com banco de dados PostgreSQL real."""

from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient

from notifications_service.infrastructure.database.models import Notification, NotificationType


class TestListNotificationsE2E:
    """Testes E2E para listagem de notificações."""

    @pytest.mark.asyncio
    async def test_list_notifications_empty(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
    ):
        """
        E2E: Testa listagem quando não há notificações no banco real.
        """
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
        """
        E2E: Testa listagem com notificações existentes no PostgreSQL.
        """
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
        """
        E2E: Testa listagem com paginação no banco real.
        """
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
        assert data["total"] == len(multiple_notifications)  # 15 notificações
        assert len(data["items"]) == 5
        assert data["page"] == 1
        assert data["page_size"] == 5
        # 15 notificações / 5 por página = 3 páginas
        assert data["total_pages"] == 3

    @pytest.mark.asyncio
    async def test_list_notifications_second_page(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """
        E2E: Testa a segunda página de notificações.
        """
        # Act
        response = await test_client.get(
            "/api/v1/notifications",
            params={
                "user_id": str(sample_user_id),
                "page": 2,
                "page_size": 5,
            }
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == len(multiple_notifications)
        assert len(data["items"]) == 5  # Segunda página com 5 itens
        assert data["page"] == 2

    @pytest.mark.asyncio
    async def test_list_notifications_unread_only(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
    ):
        """
        E2E: Testa listagem de apenas notificações não lidas.
        """
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
        # Verifica que todas as retornadas são não lidas
        for item in data["items"]:
            assert item["is_read"] is False

    @pytest.mark.asyncio
    async def test_list_notifications_user_isolation(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        another_user_id: UUID,
        sample_notification: Notification,
        another_user_notification: Notification,
    ):
        """
        E2E: Testa que um usuário não vê notificações de outro usuário.
        """
        # Act - Lista notificações do primeiro usuário
        response = await test_client.get(
            "/api/v1/notifications",
            params={"user_id": str(sample_user_id)}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["id"] == str(sample_notification.id)
        
        # Verifica que a notificação do outro usuário não aparece
        notification_ids = [item["id"] for item in data["items"]]
        assert str(another_user_notification.id) not in notification_ids


class TestGetNotificationE2E:
    """Testes E2E para obter notificação específica."""

    @pytest.mark.asyncio
    async def test_get_notification_success(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        sample_notification: Notification,
        auth_headers: dict,
    ):
        """
        E2E: Testa obter uma notificação específica pelo ID.
        """
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
        assert data["type"] == sample_notification.type

    @pytest.mark.asyncio
    async def test_get_notification_not_found(
        self,
        test_client: AsyncClient,
        auth_headers: dict,
    ):
        """
        E2E: Testa erro ao buscar notificação inexistente.
        """
        # Arrange
        fake_id = uuid4()
        
        # Act
        response = await test_client.get(
            f"/api/v1/notifications/{fake_id}",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_notification_wrong_user(
        self,
        test_client: AsyncClient,
        another_user_notification: Notification,
        auth_headers: dict,  # Headers do primeiro usuário
    ):
        """
        E2E: Testa que um usuário não pode acessar notificação de outro.
        """
        # Act
        response = await test_client.get(
            f"/api/v1/notifications/{another_user_notification.id}",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code in [403, 404]  # Forbidden ou Not Found


class TestUnreadCountE2E:
    """Testes E2E para contagem de notificações não lidas."""

    @pytest.mark.asyncio
    async def test_unread_count_zero(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
    ):
        """
        E2E: Testa contagem quando não há notificações não lidas.
        """
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
        """
        E2E: Testa contagem de notificações não lidas.
        """
        # Arrange
        expected_unread = sum(1 for n in multiple_notifications if not n.is_read)
        
        # Act
        response = await test_client.get(
            "/api/v1/notifications/unread-count",
            params={"user_id": str(sample_user_id)}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == expected_unread


class TestMarkAsReadE2E:
    """Testes E2E para marcar notificações como lidas."""

    @pytest.mark.asyncio
    async def test_mark_notification_as_read(
        self,
        test_client: AsyncClient,
        sample_notification: Notification,
        auth_headers: dict,
    ):
        """
        E2E: Testa marcar uma notificação como lida.
        """
        # Verifica estado inicial
        assert sample_notification.is_read is False
        
        # Act
        response = await test_client.post(
            f"/api/v1/notifications/{sample_notification.id}/mark-read",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["is_read"] is True
        assert data["read_at"] is not None

    @pytest.mark.asyncio
    async def test_mark_already_read_notification(
        self,
        test_client: AsyncClient,
        read_notification: Notification,
        auth_headers: dict,
    ):
        """
        E2E: Testa marcar notificação já lida (deve ser idempotente).
        """
        # Act
        response = await test_client.post(
            f"/api/v1/notifications/{read_notification.id}/mark-read",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["is_read"] is True

    @pytest.mark.asyncio
    async def test_mark_all_as_read(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
        auth_headers: dict,
    ):
        """
        E2E: Testa marcar todas as notificações como lidas.
        """
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
        assert "marcadas como lidas" in data["message"].lower() or str(unread_count) in data["message"]
        
        # Verifica que não há mais não lidas
        count_response = await test_client.get(
            "/api/v1/notifications/unread-count",
            params={"user_id": str(sample_user_id)}
        )
        assert count_response.json()["count"] == 0


class TestDeleteNotificationE2E:
    """Testes E2E para deletar notificações."""

    @pytest.mark.asyncio
    async def test_delete_notification(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        sample_notification: Notification,
        auth_headers: dict,
    ):
        """
        E2E: Testa deletar uma notificação específica.
        """
        # Act
        response = await test_client.delete(
            f"/api/v1/notifications/{sample_notification.id}",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 204
        
        # Verifica que foi deletada
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
        """
        E2E: Testa deletar notificação inexistente.
        """
        # Arrange
        fake_id = uuid4()
        
        # Act
        response = await test_client.delete(
            f"/api/v1/notifications/{fake_id}",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_clear_all_notifications(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        multiple_notifications: list[Notification],
        auth_headers: dict,
    ):
        """
        E2E: Testa deletar todas as notificações do usuário.
        """
        # Act
        response = await test_client.delete(
            "/api/v1/notifications/clear-all",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "deletadas" in data["message"].lower()
        
        # Verifica que não há mais notificações
        list_response = await test_client.get(
            "/api/v1/notifications",
            params={"user_id": str(sample_user_id)}
        )
        assert list_response.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_clear_all_does_not_affect_other_users(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        another_user_id: UUID,
        sample_notification: Notification,
        another_user_notification: Notification,
        auth_headers: dict,
    ):
        """
        E2E: Testa que limpar notificações não afeta outros usuários.
        """
        # Act
        response = await test_client.delete(
            "/api/v1/notifications/clear-all",
            headers=auth_headers,
        )
        
        # Assert
        assert response.status_code == 200
        
        # Verifica que o outro usuário ainda tem suas notificações
        other_response = await test_client.get(
            "/api/v1/notifications",
            params={"user_id": str(another_user_id)}
        )
        assert other_response.json()["total"] == 1


class TestSendNotificationE2E:
    """Testes E2E para enviar notificações."""

    @pytest.mark.asyncio
    async def test_send_notification_success(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
    ):
        """
        E2E: Testa enviar uma nova notificação.
        """
        # Arrange
        notification_data = {
            "user_id": str(sample_user_id),
            "type": "general",
            "title": "E2E Test Send Notification",
            "message": "This notification was created via E2E test",
            "extra_data": {"source": "e2e_test"},
            "action_url": "/test/action",
        }
        
        # Act
        response = await test_client.post(
            "/api/v1/notifications/send",
            json=notification_data,
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == str(sample_user_id)
        assert data["title"] == notification_data["title"]
        assert data["message"] == notification_data["message"]
        assert data["is_read"] is False
        
        # Verifica que a notificação foi persistida
        list_response = await test_client.get(
            "/api/v1/notifications",
            params={"user_id": str(sample_user_id)}
        )
        assert list_response.json()["total"] >= 1

    @pytest.mark.asyncio
    async def test_send_notification_with_organization_type(
        self,
        test_client: AsyncClient,
        sample_user_id: UUID,
        sample_organization_id: UUID,
    ):
        """
        E2E: Testa enviar notificação de tipo organização.
        """
        # Arrange
        notification_data = {
            "user_id": str(sample_user_id),
            "type": "organization_invite",
            "title": "Convite para Organização",
            "message": "Você foi convidado para participar da organização X",
            "extra_data": {
                "organization_id": str(sample_organization_id),
                "organization_name": "Test Organization",
            },
            "action_url": f"/organizations/{sample_organization_id}/invite",
        }
        
        # Act
        response = await test_client.post(
            "/api/v1/notifications/send",
            json=notification_data,
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "organization_invite"
        # extra_data é serializado como 'metadata' na resposta
        metadata = data.get("metadata") or data.get("extra_data") or {}
        assert metadata.get("organization_id") == str(sample_organization_id)

    @pytest.mark.asyncio
    async def test_send_notification_missing_required_fields(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa erro ao enviar notificação sem campos obrigatórios.
        """
        # Arrange - Faltando user_id, type, title, message
        notification_data = {
            "extra_data": {"test": "data"},
        }
        
        # Act
        response = await test_client.post(
            "/api/v1/notifications/send",
            json=notification_data,
        )
        
        # Assert
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_send_notification_invalid_user_id(
        self,
        test_client: AsyncClient,
    ):
        """
        E2E: Testa erro ao enviar notificação com user_id inválido.
        """
        # Arrange
        notification_data = {
            "user_id": "invalid-uuid",
            "type": "general",
            "title": "Test",
            "message": "Test message",
        }
        
        # Act
        response = await test_client.post(
            "/api/v1/notifications/send",
            json=notification_data,
        )
        
        # Assert
        assert response.status_code == 422  # Validation error
