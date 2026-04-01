from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from fastapi.responses import StreamingResponse

from notifications_service.api.deps import (
    CurrentUserIdDep,
    NotificationServiceDep,
    verify_internal_key,
)
from notifications_service.infrastructure.realtime import get_broadcaster, sse_event
from notifications_service.schemas.notification import (
    MessageOut,
    MarkReadRequest,
    NotificationCreateInternal,
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _schedule_unread_publish(background_tasks: BackgroundTasks, user_id: UUID, count: int) -> None:
    async def _push() -> None:
        await get_broadcaster().publish(user_id, count)

    background_tasks.add_task(_push)


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    user_id: CurrentUserIdDep,
    service: NotificationServiceDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
):
    return await service.list_notifications(
        user_id=user_id,
        page=page,
        page_size=page_size,
        unread_only=unread_only,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count_endpoint(user_id: CurrentUserIdDep, service: NotificationServiceDep):
    c = await service.count_unread(user_id)
    return UnreadCountResponse(count=c)


@router.get("/unread-count/stream")
async def unread_count_stream(user_id: CurrentUserIdDep, service: NotificationServiceDep):
    initial = await service.count_unread(user_id)
    broadcaster = get_broadcaster()

    async def gen():
        async for count in broadcaster.stream_counts(user_id, initial):
            yield sse_event(count)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/internal",
    response_model=NotificationResponse,
    dependencies=[Depends(verify_internal_key)],
)
async def create_internal_notification(
    body: NotificationCreateInternal,
    service: NotificationServiceDep,
    background_tasks: BackgroundTasks,
):
    """Criação apenas para outros microsserviços (X-Internal-API-Key)."""
    n = await service.create_internal(body)
    c = await service.count_unread(body.user_id)

    async def _push() -> None:
        await get_broadcaster().publish(body.user_id, c)

    background_tasks.add_task(_push)
    return NotificationResponse.model_validate(n)


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_one(
    notification_id: UUID,
    user_id: CurrentUserIdDep,
    service: NotificationServiceDep,
):
    return await service.get_notification(notification_id, user_id)


@router.post("/{notification_id}/mark-read", response_model=NotificationResponse)
async def mark_read(
    notification_id: UUID,
    user_id: CurrentUserIdDep,
    service: NotificationServiceDep,
    background_tasks: BackgroundTasks,
    body: MarkReadRequest,
):
    out = await service.mark_as_read(notification_id, user_id, body.action_taken)
    c = await service.count_unread(user_id)
    _schedule_unread_publish(background_tasks, user_id, c)
    return out


@router.post("/mark-all-read", response_model=MessageOut)
async def mark_all_read(
    user_id: CurrentUserIdDep,
    service: NotificationServiceDep,
    background_tasks: BackgroundTasks,
):
    n = await service.mark_all_as_read(user_id)
    _schedule_unread_publish(background_tasks, user_id, 0)
    return MessageOut(message=f"{n} notificação(ões) marcada(s) como lida(s).")


@router.delete("/clear-all", response_model=MessageOut)
async def clear_all(
    user_id: CurrentUserIdDep,
    service: NotificationServiceDep,
    background_tasks: BackgroundTasks,
):
    removed = await service.clear_all(user_id)
    _schedule_unread_publish(background_tasks, user_id, 0)
    return MessageOut(message=f"{removed} notificação(ões) removida(s).")


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_one(
    notification_id: UUID,
    user_id: CurrentUserIdDep,
    service: NotificationServiceDep,
    background_tasks: BackgroundTasks,
):
    await service.delete_notification(notification_id, user_id)
    c = await service.count_unread(user_id)
    _schedule_unread_publish(background_tasks, user_id, c)
