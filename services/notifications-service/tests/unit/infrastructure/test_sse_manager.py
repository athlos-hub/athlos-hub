"""Testes unitários para o SSEManager."""

import asyncio
import json
import pytest
from uuid import uuid4

from notifications_service.infrastructure.sse.sse_manager import SSEManager


class TestSSEManagerConnect:
    """Testes para o método connect do SSEManager."""

    @pytest.mark.asyncio
    async def test_connect_creates_queue(self):
        """Deve criar uma queue ao conectar um usuário."""
        manager = SSEManager()
        user_id = uuid4()

        queue = await manager.connect(user_id)

        assert queue is not None
        assert isinstance(queue, asyncio.Queue)
        assert manager.get_active_connections_count(user_id) == 1

    @pytest.mark.asyncio
    async def test_connect_multiple_connections_same_user(self):
        """Deve permitir múltiplas conexões para o mesmo usuário."""
        manager = SSEManager()
        user_id = uuid4()

        queue1 = await manager.connect(user_id)
        queue2 = await manager.connect(user_id)
        queue3 = await manager.connect(user_id)

        assert queue1 != queue2 != queue3
        assert manager.get_active_connections_count(user_id) == 3

    @pytest.mark.asyncio
    async def test_connect_multiple_users(self):
        """Deve permitir conexões de múltiplos usuários."""
        manager = SSEManager()
        user1 = uuid4()
        user2 = uuid4()
        user3 = uuid4()

        await manager.connect(user1)
        await manager.connect(user2)
        await manager.connect(user3)

        assert manager.get_active_connections_count(user1) == 1
        assert manager.get_active_connections_count(user2) == 1
        assert manager.get_active_connections_count(user3) == 1


class TestSSEManagerDisconnect:
    """Testes para o método disconnect do SSEManager."""

    @pytest.mark.asyncio
    async def test_disconnect_removes_queue(self):
        """Deve remover a queue ao desconectar."""
        manager = SSEManager()
        user_id = uuid4()

        queue = await manager.connect(user_id)
        assert manager.get_active_connections_count(user_id) == 1

        await manager.disconnect(user_id, queue)
        assert manager.get_active_connections_count(user_id) == 0

    @pytest.mark.asyncio
    async def test_disconnect_multiple_connections(self):
        """Deve remover apenas a queue específica ao desconectar."""
        manager = SSEManager()
        user_id = uuid4()

        queue1 = await manager.connect(user_id)
        queue2 = await manager.connect(user_id)
        queue3 = await manager.connect(user_id)

        assert manager.get_active_connections_count(user_id) == 3

        await manager.disconnect(user_id, queue2)
        assert manager.get_active_connections_count(user_id) == 2

        await manager.disconnect(user_id, queue1)
        assert manager.get_active_connections_count(user_id) == 1

        await manager.disconnect(user_id, queue3)
        assert manager.get_active_connections_count(user_id) == 0

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_user(self):
        """Deve lidar com desconexão de usuário inexistente sem erros."""
        manager = SSEManager()
        user_id = uuid4()
        queue = asyncio.Queue()

        # Não deve lançar exceção
        await manager.disconnect(user_id, queue)
        assert manager.get_active_connections_count(user_id) == 0

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_queue(self):
        """Deve lidar com desconexão de queue inexistente sem erros."""
        manager = SSEManager()
        user_id = uuid4()

        queue1 = await manager.connect(user_id)
        queue2 = asyncio.Queue()  # Queue não registrada

        await manager.disconnect(user_id, queue2)
        assert manager.get_active_connections_count(user_id) == 1


class TestSSEManagerSendNotification:
    """Testes para o método send_notification do SSEManager."""

    @pytest.mark.asyncio
    async def test_send_notification_to_single_connection(self):
        """Deve enviar notificação para uma conexão ativa."""
        manager = SSEManager()
        user_id = uuid4()
        queue = await manager.connect(user_id)

        notification_data = {
            "id": str(uuid4()),
            "title": "Test Notification",
            "message": "Test message"
        }

        await manager.send_notification(user_id, notification_data)

        # Verifica se a notificação foi colocada na queue
        assert not queue.empty()
        event_data = await queue.get()
        event = json.loads(event_data)

        assert event["type"] == "notification"
        assert event["data"] == notification_data

    @pytest.mark.asyncio
    async def test_send_notification_to_multiple_connections(self):
        """Deve enviar notificação para todas as conexões do usuário."""
        manager = SSEManager()
        user_id = uuid4()

        queue1 = await manager.connect(user_id)
        queue2 = await manager.connect(user_id)
        queue3 = await manager.connect(user_id)

        notification_data = {
            "id": str(uuid4()),
            "title": "Broadcast Test",
            "message": "Broadcast message"
        }

        await manager.send_notification(user_id, notification_data)

        # Todas as queues devem receber a notificação
        for queue in [queue1, queue2, queue3]:
            assert not queue.empty()
            event_data = await queue.get()
            event = json.loads(event_data)
            assert event["type"] == "notification"
            assert event["data"] == notification_data

    @pytest.mark.asyncio
    async def test_send_notification_to_nonexistent_user(self):
        """Deve lidar com envio para usuário sem conexões ativas."""
        manager = SSEManager()
        user_id = uuid4()

        notification_data = {"title": "Test", "message": "Test"}

        # Não deve lançar exceção
        await manager.send_notification(user_id, notification_data)

    @pytest.mark.asyncio
    async def test_send_notification_does_not_affect_other_users(self):
        """Deve enviar notificação apenas para o usuário específico."""
        manager = SSEManager()
        user1 = uuid4()
        user2 = uuid4()

        queue1 = await manager.connect(user1)
        queue2 = await manager.connect(user2)

        notification_data = {"title": "User1 Only", "message": "Private"}

        await manager.send_notification(user1, notification_data)

        # Queue do user1 deve ter a notificação
        assert not queue1.empty()

        # Queue do user2 deve estar vazia
        assert queue2.empty()


class TestSSEManagerSendUnreadCountUpdate:
    """Testes para o método send_unread_count_update do SSEManager."""

    @pytest.mark.asyncio
    async def test_send_unread_count_update(self):
        """Deve enviar atualização de contagem de não lidas."""
        manager = SSEManager()
        user_id = uuid4()
        queue = await manager.connect(user_id)

        await manager.send_unread_count_update(user_id, 5)

        assert not queue.empty()
        event_data = await queue.get()
        event = json.loads(event_data)

        assert event["type"] == "unread_count"
        assert event["data"]["count"] == 5

    @pytest.mark.asyncio
    async def test_send_unread_count_to_multiple_connections(self):
        """Deve enviar contagem para todas as conexões do usuário."""
        manager = SSEManager()
        user_id = uuid4()

        queue1 = await manager.connect(user_id)
        queue2 = await manager.connect(user_id)

        await manager.send_unread_count_update(user_id, 10)

        for queue in [queue1, queue2]:
            assert not queue.empty()
            event_data = await queue.get()
            event = json.loads(event_data)
            assert event["type"] == "unread_count"
            assert event["data"]["count"] == 10

    @pytest.mark.asyncio
    async def test_send_unread_count_to_nonexistent_user(self):
        """Deve lidar com envio para usuário sem conexões."""
        manager = SSEManager()
        user_id = uuid4()

        # Não deve lançar exceção
        await manager.send_unread_count_update(user_id, 0)


class TestSSEManagerGetActiveConnectionsCount:
    """Testes para o método get_active_connections_count do SSEManager."""

    @pytest.mark.asyncio
    async def test_get_active_connections_count_no_connections(self):
        """Deve retornar 0 para usuário sem conexões."""
        manager = SSEManager()
        user_id = uuid4()

        assert manager.get_active_connections_count(user_id) == 0

    @pytest.mark.asyncio
    async def test_get_active_connections_count_with_connections(self):
        """Deve retornar o número correto de conexões ativas."""
        manager = SSEManager()
        user_id = uuid4()

        await manager.connect(user_id)
        assert manager.get_active_connections_count(user_id) == 1

        await manager.connect(user_id)
        assert manager.get_active_connections_count(user_id) == 2

        await manager.connect(user_id)
        assert manager.get_active_connections_count(user_id) == 3


class TestSSEManagerConcurrency:
    """Testes de concorrência para o SSEManager."""

    @pytest.mark.asyncio
    async def test_concurrent_connections(self):
        """Deve lidar com múltiplas conexões simultâneas."""
        manager = SSEManager()
        user_id = uuid4()

        # Conectar múltiplos usuários simultaneamente
        tasks = [manager.connect(user_id) for _ in range(10)]
        queues = await asyncio.gather(*tasks)

        assert len(queues) == 10
        assert manager.get_active_connections_count(user_id) == 10

    @pytest.mark.asyncio
    async def test_concurrent_notifications(self):
        """Deve lidar com envio simultâneo de notificações."""
        manager = SSEManager()
        user_id = uuid4()
        queue = await manager.connect(user_id)

        # Enviar múltiplas notificações simultaneamente
        notifications = [
            {"id": str(i), "title": f"Notification {i}", "message": f"Message {i}"}
            for i in range(5)
        ]

        tasks = [
            manager.send_notification(user_id, notif)
            for notif in notifications
        ]
        await asyncio.gather(*tasks)

        # Todas as notificações devem estar na queue
        received = []
        while not queue.empty():
            event_data = await queue.get()
            event = json.loads(event_data)
            received.append(event["data"])

        assert len(received) == 5

    @pytest.mark.asyncio
    async def test_concurrent_connect_and_disconnect(self):
        """Deve lidar com conexões e desconexões simultâneas."""
        manager = SSEManager()
        user_id = uuid4()

        # Conectar
        queues = []
        for _ in range(5):
            queue = await manager.connect(user_id)
            queues.append(queue)

        assert manager.get_active_connections_count(user_id) == 5

        # Desconectar simultaneamente
        disconnect_tasks = [
            manager.disconnect(user_id, queue)
            for queue in queues[:3]
        ]
        await asyncio.gather(*disconnect_tasks)

        assert manager.get_active_connections_count(user_id) == 2
