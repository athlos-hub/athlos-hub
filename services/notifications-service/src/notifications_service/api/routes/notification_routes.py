"""Rotas de notificações."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from notifications_service.api.dependencies import (
    get_notification_service,
    get_current_user_id,
)
from notifications_service.domain.services import NotificationService
from notifications_service.schemas import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    SendNotificationRequest,
    NotificationCreate,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    service: Annotated[NotificationService, Depends(get_notification_service)],
    user_id: UUID = Query(..., description="ID do usuário"),
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    unread_only: bool = Query(False, description="Listar apenas não lidas"),
):
    """Lista notificações do usuário com paginação."""
    return await service.list_user_notifications(
        user_id=user_id,
        page=page,
        page_size=page_size,
        unread_only=unread_only,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    service: Annotated[NotificationService, Depends(get_notification_service)],
    user_id: UUID = Query(..., description="ID do usuário"),
):
    """Retorna a contagem de notificações não lidas."""
    count = await service.count_unread(user_id)
    return UnreadCountResponse(count=count)


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: UUID,
    service: Annotated[NotificationService, Depends(get_notification_service)],
    user_id: Annotated[UUID, Depends(get_current_user_id)],
):
    """Obtém uma notificação específica."""
    return await service.get_notification(notification_id, user_id)


@router.post("/{notification_id}/mark-read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: UUID,
    service: Annotated[NotificationService, Depends(get_notification_service)],
    user_id: Annotated[UUID, Depends(get_current_user_id)],
):
    """Marca uma notificação como lida."""
    return await service.mark_as_read(notification_id, user_id)


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
async def mark_all_as_read(
    service: Annotated[NotificationService, Depends(get_notification_service)],
    user_id: Annotated[UUID, Depends(get_current_user_id)],
):
    """Marca todas as notificações como lidas."""
    count = await service.mark_all_as_read(user_id)
    return {"message": f"{count} notificações marcadas como lidas"}


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    request: SendNotificationRequest,
    service: Annotated[NotificationService, Depends(get_notification_service)],
):
    """
    Envia uma notificação para um usuário.
    
    Esta rota deve ser protegida e usada apenas internamente pelos outros serviços.
    """
    notification_data = NotificationCreate(
        user_id=request.user_id,
        type=request.type,
        title=request.title,
        message=request.message,
        extra_data=request.extra_data,
        action_url=request.action_url,
    )
    
    return await service.create_notification(notification_data)
