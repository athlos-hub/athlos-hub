"""Inicialização dos schemas."""

from notifications_service.schemas.notification import (
    NotificationBase,
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    MarkReadRequest,
    MarkAllReadRequest,
    SendNotificationRequest,
)

__all__ = [
    "NotificationBase",
    "NotificationCreate",
    "NotificationResponse",
    "NotificationListResponse",
    "UnreadCountResponse",
    "MarkReadRequest",
    "MarkAllReadRequest",
    "SendNotificationRequest",
]
