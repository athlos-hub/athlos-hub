"""Cliente Novu para envio de notificações."""

import logging
from typing import Dict, Any, Optional
from uuid import UUID

from novu.api import EventApi

from notifications_service.core.config import settings
from notifications_service.core.exceptions import NovuException

logger = logging.getLogger(__name__)


class NovuClient:
    """Cliente para integração com Novu."""

    def __init__(self):
        """Inicializa o cliente Novu."""
        try:
            self.event_api = EventApi(url="https://api.novu.co", api_key=settings.novu_api_key)
        except Exception as e:
            logger.error(f"Erro ao inicializar cliente Novu: {e}")
            raise NovuException("Erro ao inicializar serviço de notificações")

    async def send_notification(
        self,
        user_id: UUID,
        template_id: str,
        payload: Dict[str, Any],
        subscriber_email: Optional[str] = None,
    ) -> str:
        """
        Envia uma notificação via Novu.
        
        Args:
            user_id: ID do usuário destinatário
            template_id: ID do template no Novu
            payload: Dados da notificação
            subscriber_email: Email do subscriber (opcional)
            
        Returns:
            ID da notificação no Novu
        """
        try:
            subscriber_id = str(user_id)
            
            response = self.event_api.trigger(
                name=template_id,
                recipients=subscriber_id,
                payload=payload,
            )
            
            if response and hasattr(response, 'transaction_id'):
                logger.info(f"Notificação enviada com sucesso para usuário {user_id}")
                return response.transaction_id
            
            logger.warning(f"Resposta do Novu sem transaction_id: {response}")
            return ''
            
        except Exception as e:
            logger.error(f"Erro ao enviar notificação via Novu: {e}")
            raise NovuException(f"Erro ao enviar notificação: {str(e)}")

    async def create_subscriber(
        self,
        user_id: UUID,
        email: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
    ) -> bool:
        """
        Cria ou atualiza um subscriber no Novu.
        
        Args:
            user_id: ID do usuário
            email: Email do usuário
            first_name: Nome do usuário
            last_name: Sobrenome do usuário
            
        Returns:
            True se sucesso
        """
        try:
            from novu.api import SubscriberApi
            
            subscriber_api = SubscriberApi(url="https://api.novu.co", api_key=settings.novu_api_key)
            subscriber_id = str(user_id)
            
            subscriber_api.create(
                subscriber_id=subscriber_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            
            logger.info(f"Subscriber criado/atualizado: {subscriber_id}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao criar subscriber no Novu: {e}")
            return False


novu_client = NovuClient()
