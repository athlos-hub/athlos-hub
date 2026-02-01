"""Testes unitários para o NotificationsClient."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4
import httpx

from notifications_service.infrastructure.external.notifications_client import NotificationsClient


class TestNotificationsClientSendNotification:
    """Testes para o método send_notification."""

    @pytest.mark.asyncio
    async def test_send_notification_success(self):
        """Deve enviar notificação com sucesso."""
        client = NotificationsClient(base_url="http://test-api")
        user_id = uuid4()

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.post = mock_post

            result = await client.send_notification(
                user_id=user_id,
                notification_type="test",
                title="Test Title",
                message="Test Message",
                extra_data={"key": "value"},
                action_url="/test",
            )

            assert result is True
            mock_post.assert_called_once()
            call_args = mock_post.call_args
            
            assert call_args[0][0] == "http://test-api/notifications/send"
            json_data = call_args[1]["json"]
            assert json_data["user_id"] == str(user_id)
            assert json_data["type"] == "test"
            assert json_data["title"] == "Test Title"
            assert json_data["message"] == "Test Message"
            assert json_data["extra_data"] == {"key": "value"}
            assert json_data["action_url"] == "/test"

    @pytest.mark.asyncio
    async def test_send_notification_without_optional_fields(self):
        """Deve enviar notificação sem campos opcionais."""
        client = NotificationsClient()
        user_id = uuid4()

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.post = mock_post

            result = await client.send_notification(
                user_id=user_id,
                notification_type="test",
                title="Test",
                message="Message",
            )

            assert result is True
            json_data = mock_post.call_args[1]["json"]
            assert json_data["extra_data"] == {}
            assert json_data["action_url"] is None

    @pytest.mark.asyncio
    async def test_send_notification_http_error(self):
        """Deve retornar False em caso de erro HTTP."""
        client = NotificationsClient()
        user_id = uuid4()

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "Error", request=MagicMock(), response=MagicMock()
            )
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.post = mock_post

            result = await client.send_notification(
                user_id=user_id,
                notification_type="test",
                title="Test",
                message="Message",
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_send_notification_request_error(self):
        """Deve retornar False em caso de erro de requisição."""
        client = NotificationsClient()
        user_id = uuid4()

        with patch("httpx.AsyncClient") as mock_client:
            mock_post = AsyncMock(side_effect=httpx.RequestError("Connection failed", request=MagicMock()))
            mock_client.return_value.__aenter__.return_value.post = mock_post

            result = await client.send_notification(
                user_id=user_id,
                notification_type="test",
                title="Test",
                message="Message",
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_send_notification_timeout_error(self):
        """Deve retornar False em caso de timeout."""
        client = NotificationsClient()
        user_id = uuid4()

        with patch("httpx.AsyncClient") as mock_client:
            mock_post = AsyncMock(side_effect=httpx.TimeoutException("Timeout", request=MagicMock()))
            mock_client.return_value.__aenter__.return_value.post = mock_post

            result = await client.send_notification(
                user_id=user_id,
                notification_type="test",
                title="Test",
                message="Message",
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_send_notification_unexpected_error(self):
        """Deve retornar False em caso de erro inesperado."""
        client = NotificationsClient()
        user_id = uuid4()

        with patch("httpx.AsyncClient") as mock_client:
            mock_post = AsyncMock(side_effect=Exception("Unexpected error"))
            mock_client.return_value.__aenter__.return_value.post = mock_post

            result = await client.send_notification(
                user_id=user_id,
                notification_type="test",
                title="Test",
                message="Message",
            )

            assert result is False


class TestNotificationsClientOrganizationMethods:
    """Testes para métodos relacionados a organizações."""

    @pytest.mark.asyncio
    async def test_send_organization_invite(self):
        """Deve enviar convite de organização."""
        client = NotificationsClient()
        user_id = uuid4()
        organization_id = uuid4()

        with patch.object(client, "send_notification", return_value=True) as mock_send:
            result = await client.send_organization_invite(
                user_id=user_id,
                organization_name="Test Org",
                organization_id=organization_id,
                inviter_name="John Doe",
            )

            assert result is True
            mock_send.assert_called_once()
            call_kwargs = mock_send.call_args[1]
            
            assert call_kwargs["user_id"] == user_id
            assert call_kwargs["notification_type"] == "organization_invite"
            assert call_kwargs["title"] == "Convite para organização"
            assert "John Doe" in call_kwargs["message"]
            assert "Test Org" in call_kwargs["message"]
            assert call_kwargs["extra_data"]["organization_id"] == str(organization_id)
            assert call_kwargs["extra_data"]["organization_name"] == "Test Org"
            assert call_kwargs["extra_data"]["inviter_name"] == "John Doe"
            assert call_kwargs["action_url"] == f"/organizations/{organization_id}"

    @pytest.mark.asyncio
    async def test_send_organization_accepted(self):
        """Deve enviar notificação de convite aceito."""
        client = NotificationsClient()
        user_id = uuid4()
        organization_id = uuid4()

        with patch.object(client, "send_notification", return_value=True) as mock_send:
            result = await client.send_organization_accepted(
                user_id=user_id,
                organization_name="Test Org",
                organization_id=organization_id,
                member_name="Jane Smith",
            )

            assert result is True
            mock_send.assert_called_once()
            call_kwargs = mock_send.call_args[1]
            
            assert call_kwargs["user_id"] == user_id
            assert call_kwargs["notification_type"] == "organization_accepted"
            assert call_kwargs["title"] == "Convite aceito"
            assert "Jane Smith" in call_kwargs["message"]
            assert "Test Org" in call_kwargs["message"]
            assert call_kwargs["extra_data"]["member_name"] == "Jane Smith"
            assert call_kwargs["action_url"] == f"/organizations/{organization_id}/members"


class TestNotificationsClientCompetitionMethods:
    """Testes para métodos relacionados a competições."""

    @pytest.mark.asyncio
    async def test_send_competition_invite(self):
        """Deve enviar convite de competição."""
        client = NotificationsClient()
        user_id = uuid4()
        competition_id = uuid4()

        with patch.object(client, "send_notification", return_value=True) as mock_send:
            result = await client.send_competition_invite(
                user_id=user_id,
                competition_name="Test Competition",
                competition_id=competition_id,
                inviter_name="John Doe",
            )

            assert result is True
            mock_send.assert_called_once()
            call_kwargs = mock_send.call_args[1]
            
            assert call_kwargs["user_id"] == user_id
            assert call_kwargs["notification_type"] == "competition_invite"
            assert call_kwargs["title"] == "Convite para competição"
            assert "John Doe" in call_kwargs["message"]
            assert "Test Competition" in call_kwargs["message"]
            assert call_kwargs["extra_data"]["competition_id"] == str(competition_id)
            assert call_kwargs["extra_data"]["competition_name"] == "Test Competition"
            assert call_kwargs["action_url"] == f"/competitions/{competition_id}"


class TestNotificationsClientLivestreamMethods:
    """Testes para métodos relacionados a livestreams."""

    @pytest.mark.asyncio
    async def test_send_livestream_started(self):
        """Deve enviar notificação de livestream iniciada."""
        client = NotificationsClient()
        user_id = uuid4()
        livestream_id = "test-stream-123"

        with patch.object(client, "send_notification", return_value=True) as mock_send:
            result = await client.send_livestream_started(
                user_id=user_id,
                livestream_title="Epic Stream",
                livestream_id=livestream_id,
                organization_name="Test Org",
            )

            assert result is True
            mock_send.assert_called_once()
            call_kwargs = mock_send.call_args[1]
            
            assert call_kwargs["user_id"] == user_id
            assert call_kwargs["notification_type"] == "livestream_started"
            assert call_kwargs["title"] == "Livestream iniciada"
            assert "Epic Stream" in call_kwargs["message"]
            assert "Test Org" in call_kwargs["message"]
            assert call_kwargs["extra_data"]["livestream_id"] == livestream_id
            assert call_kwargs["extra_data"]["livestream_title"] == "Epic Stream"
            assert call_kwargs["action_url"] == f"/live/{livestream_id}"


class TestNotificationsClientConfiguration:
    """Testes de configuração do cliente."""

    def test_client_initialization_default(self):
        """Deve inicializar com valores padrão."""
        client = NotificationsClient()

        assert client.base_url == "http://localhost:8003/api/v1"
        assert client.timeout == 10.0

    def test_client_initialization_custom(self):
        """Deve inicializar com valores customizados."""
        client = NotificationsClient(base_url="http://custom-api:9000")

        assert client.base_url == "http://custom-api:9000"
        assert client.timeout == 10.0
