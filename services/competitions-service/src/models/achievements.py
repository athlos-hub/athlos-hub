import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, ForeignKey, DateTime, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from src.models.base import Base


class CompetitionAchievementDefinitionModel(Base):
    __tablename__ = "competition_achievement_definitions"
    __table_args__ = (
        UniqueConstraint(
            "competition_id",
            "stat_type_id",
            name="uq_competition_achievement_definition_competition_stat_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    competition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    stat_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stats_types.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(120), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    title_locked: Mapped[bool] = mapped_column(default=False, nullable=False)
    target_type: Mapped[str] = mapped_column(String(16), default="PLAYER", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(400), nullable=True)
    top_n: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class CompetitionAchievementAwardModel(Base):
    __tablename__ = "competition_achievement_awards"
    __table_args__ = (
        UniqueConstraint(
            "competition_id",
            "definition_id",
            "target_type",
            "player_id",
            "team_id",
            name="uq_competition_achievement_award_comp_def_player",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    competition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competition_achievement_definitions.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_type: Mapped[str] = mapped_column(String(16), default="PLAYER", nullable=False)
    player_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=True
    )
    player_keycloak_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    team_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=True
    )
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    stat_value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
