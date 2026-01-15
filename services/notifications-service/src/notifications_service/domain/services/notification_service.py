"""Serviço de notificações com lógica de negócio."""

import logging
from typing import Optional
from uuid import UUID
import math

from notifications_service.core.exceptions import (
    NotificationNotFoundException,
    NotificationAccessDeniedException,
)
from notifications_service.domain.interfaces.repositories import INotificationRepository
from notifications_service.infrastructure.database.models import Notification, NotificationType
from notifications_service.infrastructure.external import novu_client
from notifications_service.schemas import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
)

logger = logging.getLogger(__name__)


class NotificationService:
    """Serviço de gerenciamento de notificações."""

    def __init__(self, notification_repo: INotificationRepository):
        self.notification_repo = notification_repo
        self.novu = novu_client

    async def create_notification(
        self,
        notification_data: NotificationCreate,
        send_to_novu: bool = True,
    ) -> NotificationResponse:
        """
        Cria uma nova notificação.
        
        Args:
            notification_data: Dados da notificação
            send_to_novu: Se deve enviar para o Novu
            
        Returns:
            Notificação criada
        """
        notification = Notification(
            user_id=notification_data.user_id,
            type=notification_data.type,
            title=notification_data.title,
            message=notification_data.message,
            extra_data=notification_data.extra_data,
            action_url=notification_data.action_url,
        )
        
        notification = await self.notification_repo.create(notification)
        
        if send_to_novu:
            try:
                novu_id = await self.novu.send_notification(
                    user_id=notification_data.user_id,
                    template_id=notification_data.type,
                    payload={
                        "title": notification_data.title,
                        "message": notification_data.message,
                        "extra_data": notification_data.extra_data or {},
                        "action_url": notification_data.action_url,
                    },
                )
                notification.novu_notification_id = novu_id
                await self.notification_repo.session.commit()
            except Exception as e:
                logger.error(f"Erro ao enviar notificação para Novu: {e}")
        
        return NotificationResponse.model_validate(notification)

    async def get_notification(
        self,
        notification_id: UUID,
        user_id: UUID,
    ) -> NotificationResponse:
        """
        Busca uma notificação específica.
        
        Args:
            notification_id: ID da notificação
            user_id: ID do usuário (para verificar acesso)
            
        Returns:
            Notificação encontrada
        """
        notification = await self.notification_repo.get_by_id(notification_id)
        
        if not notification:
            raise NotificationNotFoundException(str(notification_id))
        
        if notification.user_id != user_id:
            raise NotificationAccessDeniedException()
        
        return NotificationResponse.model_validate(notification)

    async def list_user_notifications(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 50,
        unread_only: bool = False,
    ) -> NotificationListResponse:
        """
        Lista notificações de um usuário com paginação.
        
        Args:
            user_id: ID do usuário
            page: Número da página
            page_size: Tamanho da página
            unread_only: Se deve listar apenas não lidas
            
        Returns:
            Lista paginada de notificações
        """
        skip = (page - 1) * page_size
        
        notifications, total = await self.notification_repo.get_by_user(
            user_id=user_id,
            skip=skip,
            limit=page_size,
            unread_only=unread_only,
        )
        
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        
        return NotificationListResponse(
            items=[NotificationResponse.model_validate(n) for n in notifications],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def mark_as_read(
        self,
        notification_id: UUID,
        user_id: UUID,
    ) -> NotificationResponse:
        """
        Marca uma notificação como lida.
        
        Args:
            notification_id: ID da notificação
            user_id: ID do usuário (para verificar acesso)
            
        Returns:
            Notificação atualizada
        """
        await self.get_notification(notification_id, user_id)
        
        notification = await self.notification_repo.mark_as_read(notification_id)
        
        if not notification:
            raise NotificationNotFoundException(str(notification_id))
        
        return NotificationResponse.model_validate(notification)

    async def mark_all_as_read(self, user_id: UUID) -> int:
        """
        Marca todas as notificações de um usuário como lidas.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Número de notificações marcadas como lidas
        """
        return await self.notification_repo.mark_all_as_read(user_id)

    async def count_unread(self, user_id: UUID) -> int:
        """
        Conta notificações não lidas de um usuário.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Número de notificações não lidas
        """
        return await self.notification_repo.count_unread(user_id)

    async def send_organization_invite(
        self,
        user_id: UUID,
        organization_name: str,
        organization_id: UUID,
        inviter_name: str,
    ) -> NotificationResponse:
        """
        Envia notificação de convite para organização.
        
        Args:
            user_id: ID do usuário convidado
            organization_name: Nome da organização
            organization_id: ID da organização
            inviter_name: Nome de quem convidou
            
        Returns:
            Notificação criada
        """
        notification_data = NotificationCreate(
            user_id=user_id,
            type=NotificationType.ORGANIZATION_INVITE.value,
            title="Convite para organização",
            message=f"{inviter_name} convidou você para participar de {organization_name}",
            extra_data={
                "organization_id": str(organization_id),
                "organization_name": organization_name,
                "inviter_name": inviter_name,
            },
            action_url=f"/organizations/{organization_id}",
        )
        
        return await self.create_notification(notification_data)

    async def send_organization_accepted(
        self,
        user_id: UUID,
        organization_name: str,
        organization_id: UUID,
        member_name: str,
    ) -> NotificationResponse:
        """
        Envia notificação de convite aceito.
        
        Args:
            user_id: ID do dono/organizador da organização
            organization_name: Nome da organização
            organization_id: ID da organização
            member_name: Nome do membro que aceitou
            
        Returns:
            Notificação criada
        """
        notification_data = NotificationCreate(
            user_id=user_id,
            type=NotificationType.ORGANIZATION_ACCEPTED.value,
            title="Convite aceito",
            message=f"{member_name} aceitou o convite para {organization_name}",
            extra_data={
                "organization_id": str(organization_id),
                "organization_name": organization_name,
                "member_name": member_name,
            },
            action_url=f"/organizations/{organization_id}/members",
        )
        
        return await self.create_notification(notification_data)

    async def delete_notification(
        self,
        notification_id: UUID,
        user_id: UUID,
    ) -> None:
        """
        Deleta uma notificação específica.
        
        Args:
            notification_id: ID da notificação
            user_id: ID do usuário (para verificar acesso)
        """
        notification = await self.notification_repo.get_by_id(notification_id)
        
        if not notification:
            raise NotificationNotFoundException(str(notification_id))
        
        if notification.user_id != user_id:
            raise NotificationAccessDeniedException()
        
        await self.notification_repo.delete(notification)
        await self.notification_repo.session.commit()
        
        logger.info(f"Notificação {notification_id} deletada pelo usuário {user_id}")

    async def clear_all_notifications(
        self,
        user_id: UUID,
    ) -> int:
        """
        Deleta todas as notificações do usuário.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Número de notificações deletadas
        """
        count = await self.notification_repo.delete_all_by_user(user_id)
        await self.notification_repo.session.commit()
        
        logger.info(f"{count} notificações deletadas para o usuário {user_id}")
        return count
