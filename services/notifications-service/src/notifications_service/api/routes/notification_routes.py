"""Rotas de notificações."""

import asyncio
import json
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse

from notifications_service.api.dependencies import (
    get_notification_service,
    get_current_user_id,
)
from notifications_service.domain.services import NotificationService
from notifications_service.infrastructure.sse import sse_manager

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


@router.get("/stream")
async def stream_notifications(
    user_id: UUID = Query(..., description="ID do usuário"),
):
    """
    Stream de notificações em tempo real usando Server-Sent Events (SSE).
    
    O cliente mantém uma conexão aberta e recebe notificações em tempo real.
    """
    async def event_generator():
        queue = await sse_manager.connect(user_id)
        
        try:
            yield f"data: {json.dumps({'type': 'connected', 'data': {'message': 'Conectado ao stream de notificações'}})}\n\n"
            
            while True:
                try:
                    event_data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {event_data}\n\n"
                except asyncio.TimeoutError:
                    yield f": heartbeat\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await sse_manager.disconnect(user_id, queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


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


@router.delete("/clear-all", status_code=status.HTTP_200_OK)
async def clear_all_notifications(
    service: Annotated[NotificationService, Depends(get_notification_service)],
    user_id: Annotated[UUID, Depends(get_current_user_id)],
):
    """Deleta todas as notificações do usuário."""
    count = await service.clear_all_notifications(user_id)
    return {"message": f"{count} notificações deletadas"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    service: Annotated[NotificationService, Depends(get_notification_service)],
    user_id: Annotated[UUID, Depends(get_current_user_id)],
):
    """Deleta uma notificação específica."""
    await service.delete_notification(notification_id, user_id)


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
