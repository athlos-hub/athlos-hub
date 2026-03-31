import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from live_service.infrastructure.database.base import Base


class LiveEvent(Base):
    __tablename__ = "LiveEvent"
    __table_args__ = (
        Index("LiveEvent_live_id_idx", "live_id"),
        Index("LiveEvent_live_id_created_at_idx", "live_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    live_id: Mapped[str] = mapped_column(
        "live_id",
        String(36),
        ForeignKey("Live.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
