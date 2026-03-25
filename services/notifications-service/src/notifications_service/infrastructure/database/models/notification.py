"""Modelo ORM de notificação."""

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from notifications_service.infrastructure.database.base import Base
from notifications_service.core.config import settings


class NotificationType(str, Enum):
    """Tipos conhecidos (o banco aceita qualquer string em `type`)."""

    ORGANIZATION_INVITE = "organization_invite"
    ORGANIZATION_ACCEPTED = "organization_accepted"
    ORGANIZATION_JOIN_REQUEST = "organization_join_request"
    ORGANIZATION_REQUEST_APPROVED = "organization_request_approved"
    ORGANIZATION_REQUEST_REJECTED = "organization_request_rejected"
    ORGANIZATION_MEMBER_REMOVED = "organization_member_removed"
    ORGANIZATION_MEMBER_LEFT = "organization_member_left"
    ORGANIZATION_ORGANIZER_ADDED = "organization_organizer_added"
    ORGANIZATION_ORGANIZER_REMOVED = "organization_organizer_removed"
    ORGANIZATION_INVITE_CANCELLED = "organization_invite_cancelled"
    ORGANIZATION_INVITE_DECLINED = "organization_invite_declined"
    ORGANIZATION_OWNERSHIP_RECEIVED = "organization_ownership_received"
    ORGANIZATION_OWNERSHIP_TRANSFERRED = "organization_ownership_transferred"
    ORGANIZATION_APPROVED = "organization_approved"
    ORGANIZATION_SUSPENDED = "organization_suspended"
    ORGANIZATION_UNSUSPENDED = "organization_unsuspended"
    ORGANIZATION_DELETED = "organization_deleted"
    FOLLOW = "follow"
    POST_LIKE = "post_like"
    POST_COMMENT = "post_comment"
    POST_SHARE = "post_share"
    COMMENT_REPLY = "comment_reply"
    ORGANIZATION_FOLLOW = "organization_follow"
    COMPETITION_TEAM_MEMBER_JOINED = "competition_team_member_joined"
    GENERAL = "general"


class Notification(Base):
    __tablename__ = "notifications"
    if settings.notifications_database_schema:
        __table_args__ = {"schema": settings.notifications_database_schema}
    else:
        __table_args__ = {}

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
