"""Schemas de notificação."""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class NotificationBase(BaseModel):
    """Schema base de notificação."""

    type: str
    title: str
    message: str
    extra_data: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = None


class NotificationCreate(NotificationBase):
    """Schema para criação de notificação."""

    user_id: UUID


class NotificationResponse(NotificationBase):
    """Schema de resposta de notificação."""

    id: UUID
    user_id: UUID
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Schema de resposta de lista de notificações."""

    items: list[NotificationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UnreadCountResponse(BaseModel):
    """Schema de resposta de contagem de não lidas."""

    count: int


class MarkReadRequest(BaseModel):
    """Schema para marcar como lida."""

    pass


class MarkAllReadRequest(BaseModel):
    """Schema para marcar todas como lidas."""

    pass


class SendNotificationRequest(BaseModel):
    """Schema para enviar notificação."""

    user_id: UUID
    type: str
    title: str
    message: str
    extra_data: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = None
