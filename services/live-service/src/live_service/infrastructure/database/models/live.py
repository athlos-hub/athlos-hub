import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from live_service.common.enums import LiveStatus
from live_service.infrastructure.database.base import Base


class Live(Base):
    __tablename__ = "Live"
    __table_args__ = (Index("Live_organization_id_idx", "organization_id"),)

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    external_match_id: Mapped[str] = mapped_column(
        "external_match_id", String, unique=True, nullable=False
    )
    organization_id: Mapped[str] = mapped_column("organization_id", String, nullable=False)
    stream_key: Mapped[str] = mapped_column("stream_key", String, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=LiveStatus.SCHEDULED.value,
    )
    started_at: Mapped[datetime | None] = mapped_column("started_at", DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column("ended_at", DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
