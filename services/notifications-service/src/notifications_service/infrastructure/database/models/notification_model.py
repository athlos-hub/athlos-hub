"""Modelos de banco de dados."""

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from database.base import Base
from notifications_service.core.config import settings


class NotificationType(str, Enum):
    """Tipos de notificações."""

    ORGANIZATION_INVITE = "organization_invite"
    ORGANIZATION_ACCEPTED = "organization_accepted"
    GENERAL = "general"


class Notification(Base):
    """Modelo de notificação."""

    __tablename__ = "notifications"
    __table_args__ = {"schema": settings.notifications_database_schema}

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    extra_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    novu_notification_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type})>"
