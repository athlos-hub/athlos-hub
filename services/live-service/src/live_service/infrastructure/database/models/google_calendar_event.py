import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from live_service.infrastructure.database.base import Base


class GoogleCalendarEvent(Base):
    __tablename__ = "GoogleCalendarEvent"
    __table_args__ = (
        UniqueConstraint("user_id", "live_id", name="GoogleCalendarEvent_user_id_live_id_key"),
        Index("GoogleCalendarEvent_user_id_idx", "user_id"),
        Index("GoogleCalendarEvent_live_id_idx", "live_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        "user_id",
        String,
        ForeignKey("GoogleCalendarToken.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    live_id: Mapped[str] = mapped_column(
        "live_id",
        String(36),
        ForeignKey("Live.id", ondelete="CASCADE"),
        nullable=False,
    )
    event_id: Mapped[str] = mapped_column("event_id", String, nullable=False)
    html_link: Mapped[str | None] = mapped_column("html_link", String)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(),
        onupdate=lambda: datetime.now(),
    )
