import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.competition import CompetitionModel
    from src.models.teams import TeamModel

# Enums para status
class MatchStatus(str, enum.Enum):
    SCHEDULED = "scheduled" 
    LIVE = "live"           
    FINISHED = "finished"   
    CANCELED = "canceled"   

class GroupModel(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))
    name: Mapped[str] = mapped_column(String(50)) 

    # Relacionamentos
    competition: Mapped["CompetitionModel"] = relationship("CompetitionModel")
    matches: Mapped[List["MatchModel"]] = relationship("MatchModel", back_populates="group")

class RoundModel(Base):
    __tablename__ = "rounds"

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))    
    
    name: Mapped[str] = mapped_column(String(50)) 

    matches: Mapped[List["MatchModel"]] = relationship("MatchModel", back_populates="round")

class MatchModel(Base):
    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("groups.id"), nullable=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("rounds.id"), nullable=False)
    round_number_match: Mapped[int] = mapped_column(Integer, nullable=False)
    home_team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    away_team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    home_feeder_match_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("matches.id"), nullable=True)
    away_feeder_match_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("matches.id"), nullable=True)
    local: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    scheduled_datetime: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[MatchStatus] = mapped_column(String, default=MatchStatus.SCHEDULED)
    home_score: Mapped[int] = mapped_column(Integer, default=0)
    away_score: Mapped[int] = mapped_column(Integer, default=0)
    has_penalties: Mapped[bool] = mapped_column(Boolean, default=False)
    has_overtime: Mapped[bool] = mapped_column(Boolean, default=False)
    winner_team_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("teams.id"), nullable=True)

    group: Mapped["GroupModel"] = relationship("GroupModel", back_populates="matches")
    round: Mapped["RoundModel"] = relationship("RoundModel", back_populates="matches")
    
    home_team: Mapped["TeamModel"] = relationship("TeamModel", foreign_keys=[home_team_id])
    away_team: Mapped["TeamModel"] = relationship("TeamModel", foreign_keys=[away_team_id])
    home_feeder_match_id: Mapped[Optional["MatchModel"]] = relationship("MatchModel", foreign_keys=[home_feeder_match_id])
    away_feeder_match_id: Mapped[Optional["MatchModel"]] = relationship("MatchModel", foreign_keys=[away_feeder_match_id])
    winner_team_id: Mapped[Optional["TeamModel"]] = relationship("TeamModel", foreign_keys=[winner_team_id])

    segments: Mapped[List["SegmentModel"]] = relationship("SegmentModel", back_populates="match", cascade="all, delete-orphan")

class SegmentModel(Base):
    __tablename__ = "segments"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matches.id"))
    
    segment_number: Mapped[int] = mapped_column(Integer) 
    segment_type: Mapped[str] = mapped_column(String(20))
    home_score: Mapped[int] = mapped_column(Integer, default=0)
    away_score: Mapped[int] = mapped_column(Integer, default=0)
    finished: Mapped[bool] = mapped_column(Boolean, default=False)

    match: Mapped["MatchModel"] = relationship("MatchModel", back_populates="segments")