"""Testes unitários para o NovuClient."""

import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from notifications_service.infrastructure.external.novu_client import NovuClient
from notifications_service.core.exceptions import NovuException


class TestNovuClientInitialization:
    """Testes de inicialização do NovuClient."""

    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    def test_initialization_success(self, mock_event_api):
        """Deve inicializar o cliente Novu com sucesso."""
        mock_event_api.return_value = MagicMock()

        client = NovuClient()

        assert client.event_api is not None
        mock_event_api.assert_called_once()

    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    def test_initialization_failure(self, mock_event_api):
        """Deve lançar NovuException em caso de falha na inicialização."""
        mock_event_api.side_effect = Exception("API Key inválida")

        with pytest.raises(NovuException) as exc_info:
            NovuClient()

        assert "Erro ao inicializar serviço de notificações" in str(exc_info.value)


class TestNovuClientSendNotification:
    """Testes para o método send_notification."""

    @pytest.mark.asyncio
    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    async def test_send_notification_success(self, mock_event_api):
        """Deve enviar notificação com sucesso via Novu."""
        user_id = uuid4()
        template_id = "test-template"
        payload = {"title": "Test", "message": "Test message"}

        # Mock da resposta do Novu
        mock_response = MagicMock()
        mock_response.transaction_id = "txn_123456"
        
        mock_api_instance = MagicMock()
        mock_api_instance.trigger.return_value = mock_response
        mock_event_api.return_value = mock_api_instance

        client = NovuClient()
        result = await client.send_notification(
            user_id=user_id,
            template_id=template_id,
            payload=payload,
        )

        assert result == "txn_123456"
        mock_api_instance.trigger.assert_called_once_with(
            name=template_id,
            recipients=str(user_id),
            payload=payload,
        )

    @pytest.mark.asyncio
    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    async def test_send_notification_with_subscriber_email(self, mock_event_api):
        """Deve enviar notificação incluindo email do subscriber."""
        user_id = uuid4()
        template_id = "test-template"
        payload = {"title": "Test"}
        subscriber_email = "test@example.com"

        mock_response = MagicMock()
        mock_response.transaction_id = "txn_789"
        
        mock_api_instance = MagicMock()
        mock_api_instance.trigger.return_value = mock_response
        mock_event_api.return_value = mock_api_instance

        client = NovuClient()
        result = await client.send_notification(
            user_id=user_id,
            template_id=template_id,
            payload=payload,
            subscriber_email=subscriber_email,
        )

        assert result == "txn_789"

    @pytest.mark.asyncio
    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    async def test_send_notification_no_transaction_id(self, mock_event_api):
        """Deve retornar string vazia se resposta não tiver transaction_id."""
        user_id = uuid4()
        template_id = "test-template"
        payload = {"title": "Test"}

        # Mock de resposta sem transaction_id
        mock_response = MagicMock(spec=[])  # Sem atributo transaction_id
        
        mock_api_instance = MagicMock()
        mock_api_instance.trigger.return_value = mock_response
        mock_event_api.return_value = mock_api_instance

        client = NovuClient()
        result = await client.send_notification(
            user_id=user_id,
            template_id=template_id,
            payload=payload,
        )

        assert result == ''

    @pytest.mark.asyncio
    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    async def test_send_notification_novu_error(self, mock_event_api):
        """Deve lançar NovuException em caso de erro na API."""
        user_id = uuid4()
        template_id = "test-template"
        payload = {"title": "Test"}

        mock_api_instance = MagicMock()
        mock_api_instance.trigger.side_effect = Exception("Novu API Error")
        mock_event_api.return_value = mock_api_instance

        client = NovuClient()

        with pytest.raises(NovuException) as exc_info:
            await client.send_notification(
                user_id=user_id,
                template_id=template_id,
                payload=payload,
            )

        assert "Erro ao enviar notificação" in str(exc_info.value)

    @pytest.mark.asyncio
    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    async def test_send_notification_with_complex_payload(self, mock_event_api):
        """Deve enviar notificação com payload complexo."""
        user_id = uuid4()
        template_id = "complex-template"
        payload = {
            "title": "Complex Notification",
            "message": "Detailed message",
            "metadata": {
                "organization_id": str(uuid4()),
                "items": ["item1", "item2", "item3"],
                "count": 42,
            },
        }

        mock_response = MagicMock()
        mock_response.transaction_id = "txn_complex"
        
        mock_api_instance = MagicMock()
        mock_api_instance.trigger.return_value = mock_response
        mock_event_api.return_value = mock_api_instance

        client = NovuClient()
        result = await client.send_notification(
            user_id=user_id,
            template_id=template_id,
            payload=payload,
        )

        assert result == "txn_complex"
        call_args = mock_api_instance.trigger.call_args[1]
        assert call_args["payload"] == payload


class TestNovuClientCreateSubscriber:
    """Testes para o método create_subscriber."""

    @pytest.mark.asyncio
    @patch("novu.api.SubscriberApi")
    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    async def test_create_subscriber_success(self, mock_event_api, mock_subscriber_api_class):
        """Deve criar subscriber com sucesso."""
        user_id = uuid4()
        email = "user@example.com"
        first_name = "John"
        last_name = "Doe"

        mock_subscriber_instance = MagicMock()
        mock_subscriber_api_class.return_value = mock_subscriber_instance
        mock_event_api.return_value = MagicMock()

        client = NovuClient()
        result = await client.create_subscriber(
            user_id=user_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

        assert result is True
        mock_subscriber_instance.create.assert_called_once_with(
            subscriber_id=str(user_id),
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

    @pytest.mark.asyncio
    @patch("novu.api.SubscriberApi")
    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    async def test_create_subscriber_without_names(self, mock_event_api, mock_subscriber_api_class):
        """Deve criar subscriber sem nomes opcionais."""
        user_id = uuid4()
        email = "user@example.com"

        mock_subscriber_instance = MagicMock()
        mock_subscriber_api_class.return_value = mock_subscriber_instance
        mock_event_api.return_value = MagicMock()

        client = NovuClient()
        result = await client.create_subscriber(
            user_id=user_id,
            email=email,
        )

        assert result is True
        mock_subscriber_instance.create.assert_called_once_with(
            subscriber_id=str(user_id),
            email=email,
            first_name=None,
            last_name=None,
        )

    @pytest.mark.asyncio
    @patch("novu.api.SubscriberApi")
    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    async def test_create_subscriber_error(self, mock_event_api, mock_subscriber_api_class):
        """Deve retornar False em caso de erro ao criar subscriber."""
        user_id = uuid4()
        email = "user@example.com"

        mock_subscriber_instance = MagicMock()
        mock_subscriber_instance.create.side_effect = Exception("Subscriber API Error")
        mock_subscriber_api_class.return_value = mock_subscriber_instance
        mock_event_api.return_value = MagicMock()

        client = NovuClient()
        result = await client.create_subscriber(
            user_id=user_id,
            email=email,
        )

        assert result is False

    @pytest.mark.asyncio
    @patch("novu.api.SubscriberApi")
    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    async def test_create_subscriber_updates_existing(self, mock_event_api, mock_subscriber_api_class):
        """Deve atualizar subscriber existente."""
        user_id = uuid4()
        email = "updated@example.com"
        first_name = "Jane"
        last_name = "Smith"

        mock_subscriber_instance = MagicMock()
        mock_subscriber_api_class.return_value = mock_subscriber_instance
        mock_event_api.return_value = MagicMock()

        client = NovuClient()
        result = await client.create_subscriber(
            user_id=user_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

        assert result is True
        mock_subscriber_instance.create.assert_called_once()


class TestNovuClientIntegration:
    """Testes de integração entre métodos do NovuClient."""

    @pytest.mark.asyncio
    @patch("novu.api.SubscriberApi")
    @patch("notifications_service.infrastructure.external.novu_client.EventApi")
    async def test_create_subscriber_then_send_notification(
        self, mock_event_api, mock_subscriber_api_class
    ):
        """Deve criar subscriber e depois enviar notificação."""
        user_id = uuid4()
        email = "user@example.com"

        # Mock subscriber
        mock_subscriber_instance = MagicMock()
        mock_subscriber_api_class.return_value = mock_subscriber_instance

        # Mock event
        mock_response = MagicMock()
        mock_response.transaction_id = "txn_integration"
        mock_api_instance = MagicMock()
        mock_api_instance.trigger.return_value = mock_response
        mock_event_api.return_value = mock_api_instance

        client = NovuClient()

        # Criar subscriber
        subscriber_result = await client.create_subscriber(
            user_id=user_id,
            email=email,
            first_name="Test",
            last_name="User",
        )

        assert subscriber_result is True

        # Enviar notificação
        notification_result = await client.send_notification(
            user_id=user_id,
            template_id="welcome",
            payload={"message": "Welcome!"},
        )

        assert notification_result == "txn_integration"
