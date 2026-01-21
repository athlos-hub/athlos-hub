"""Dependências da aplicação."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.dependencies import get_session
from notifications_service.domain.interfaces.repositories import INotificationRepository
from notifications_service.domain.services import NotificationService
from notifications_service.infrastructure.repositories import NotificationRepository


async def get_notification_repository(
    session: Annotated[AsyncSession, Depends(get_session)]
) -> INotificationRepository:
    """Retorna o repositório de notificações."""
    return NotificationRepository(session)


async def get_notification_service(
    notification_repo: Annotated[INotificationRepository, Depends(get_notification_repository)]
) -> NotificationService:
    """Retorna o serviço de notificações."""
    return NotificationService(notification_repo)


async def get_current_user_id(
    x_user_id: Annotated[str | None, Header()] = None,
) -> UUID:
    """
    Extrai o ID do usuário do header.
    
    Em produção, isso viria do token JWT validado.
    Por enquanto, usamos um header simples para desenvolvimento.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não autenticado",
        )
    
    try:
        return UUID(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de usuário inválido",
        )
