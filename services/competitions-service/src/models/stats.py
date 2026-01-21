import uuid
from typing import List, TYPE_CHECKING
from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.dialects.postgresql import UUID

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.competition import CompetitionModel
    from src.models.teams import PlayerModel


class StatsRuleSetModel(Base):
    __tablename__ = "stats_rulesets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), unique=True)

    # Relacionamentos
    competition: Mapped["CompetitionModel"] = relationship("CompetitionModel")
    stats_types: Mapped[List["StatsTypeModel"]] = relationship(
        "StatsTypeModel", back_populates="stats_ruleset", cascade="all, delete-orphan"
    )

class StatsTypeModel(Base):
    __tablename__ = "stats_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    abbreviation: Mapped[str] = mapped_column(String(20), nullable=False)
    stats_ruleset_id: Mapped[int] = mapped_column(ForeignKey("stats_rulesets.id"))

    # Relacionamentos
    stats_ruleset: Mapped["StatsRuleSetModel"] = relationship("StatsRuleSetModel", back_populates="stats_types")
    player_stats: Mapped[List["PlayerStatsModel"]] = relationship(
        "PlayerStatsModel", back_populates="stats_type", cascade="all, delete-orphan"
    )

class PlayerStatsModel(Base):
    __tablename__ = "player_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"))
    stats_type_id: Mapped[int] = mapped_column(ForeignKey("stats_types.id"))
    match_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("matches.id"))
    value: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relacionamentos
    stats_type: Mapped["StatsTypeModel"] = relationship("StatsTypeModel", back_populates="player_stats")

