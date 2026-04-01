"""Schemas de notificação."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreateInternal(BaseModel):
    user_id: UUID
    type: str
    title: str
    message: str
    extra_data: dict[str, Any] | None = None
    action_url: str | None = None


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    title: str
    message: str
    action_url: str | None = None
    action_taken: str | None = None
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    extra_data: dict[str, Any] | None = Field(None, serialization_alias="metadata")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UnreadCountResponse(BaseModel):
    count: int


class MessageOut(BaseModel):
    message: str


class MarkReadRequest(BaseModel):
    action_taken: str | None = None
