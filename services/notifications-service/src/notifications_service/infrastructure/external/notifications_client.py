"""Cliente HTTP para comunicação com o serviço de notificações."""

import logging
from typing import Dict, Any, Optional
from uuid import UUID

import httpx

from notifications_service.core.config import settings

logger = logging.getLogger(__name__)


class NotificationsClient:
    """Cliente para comunicação com o serviço de notificações."""

    def __init__(self, base_url: str = "http://localhost:8003/api/v1"):
        self.base_url = base_url
        self.timeout = 10.0

    async def send_notification(
        self,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        extra_data: Optional[Dict[str, Any]] = None,
        action_url: Optional[str] = None,
    ) -> bool:
        """
        Envia uma notificação para um usuário.
        
        Args:
            user_id: ID do usuário destinatário
            notification_type: Tipo da notificação
            title: Título da notificação
            message: Mensagem da notificação
            extra_data: Dados adicionais
            action_url: URL de ação
            
        Returns:
            True se enviado com sucesso
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/notifications/send",
                    json={
                        "user_id": str(user_id),
                        "type": notification_type,
                        "title": title,
                        "message": message,
                        "extra_data": extra_data or {},
                        "action_url": action_url,
                    },
                )
                response.raise_for_status()
                logger.info(f"Notificação enviada com sucesso para usuário {user_id}")
                return True
        except httpx.HTTPError as e:
            logger.error(f"Erro ao enviar notificação: {e}")
            return False
        except Exception as e:
            logger.error(f"Erro inesperado ao enviar notificação: {e}")
            return False

    async def send_organization_invite(
        self,
        user_id: UUID,
        organization_name: str,
        organization_id: UUID,
        inviter_name: str,
    ) -> bool:
        """Envia notificação de convite para organização."""
        return await self.send_notification(
            user_id=user_id,
            notification_type="organization_invite",
            title="Convite para organização",
            message=f"{inviter_name} convidou você para participar de {organization_name}",
            extra_data={
                "organization_id": str(organization_id),
                "organization_name": organization_name,
                "inviter_name": inviter_name,
            },
            action_url=f"/organizations/{organization_id}",
        )

    async def send_organization_accepted(
        self,
        user_id: UUID,
        organization_name: str,
        organization_id: UUID,
        member_name: str,
    ) -> bool:
        """Envia notificação de convite aceito."""
        return await self.send_notification(
            user_id=user_id,
            notification_type="organization_accepted",
            title="Convite aceito",
            message=f"{member_name} aceitou o convite para {organization_name}",
            extra_data={
                "organization_id": str(organization_id),
                "organization_name": organization_name,
                "member_name": member_name,
            },
            action_url=f"/organizations/{organization_id}/members",
        )

    async def send_competition_invite(
        self,
        user_id: UUID,
        competition_name: str,
        competition_id: UUID,
        inviter_name: str,
    ) -> bool:
        """Envia notificação de convite para competição."""
        return await self.send_notification(
            user_id=user_id,
            notification_type="competition_invite",
            title="Convite para competição",
            message=f"{inviter_name} convidou você para participar de {competition_name}",
            extra_data={
                "competition_id": str(competition_id),
                "competition_name": competition_name,
                "inviter_name": inviter_name,
            },
            action_url=f"/competitions/{competition_id}",
        )

    async def send_livestream_started(
        self,
        user_id: UUID,
        livestream_title: str,
        livestream_id: str,
        organization_name: str,
    ) -> bool:
        """Envia notificação de livestream iniciada."""
        return await self.send_notification(
            user_id=user_id,
            notification_type="livestream_started",
            title="Livestream iniciada",
            message=f"{organization_name} iniciou uma transmissão: {livestream_title}",
            extra_data={
                "livestream_id": livestream_id,
                "livestream_title": livestream_title,
                "organization_name": organization_name,
            },
            action_url=f"/live/{livestream_id}",
        )


notifications_client = NotificationsClient()
