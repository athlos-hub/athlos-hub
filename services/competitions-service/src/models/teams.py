import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.competition import CompetitionModel

class TeamStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"

class PlayerModel(Base):
    __tablename__ = "players"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    team: Mapped["TeamModel"] = relationship(
        "TeamModel", 
        back_populates="players",
        foreign_keys=[team_id] 
    )

class TeamModel(Base):
    __tablename__ = "teams"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_code: Mapped[str] = mapped_column(String(50), index=True) 
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))
    name: Mapped[str] = mapped_column(String(100))
    abbreviation: Mapped[Optional[str]] = mapped_column(String(3), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[TeamStatus] = mapped_column(String(20), default=TeamStatus.PENDING) 

    competition: Mapped["CompetitionModel"] = relationship("CompetitionModel")

    team_captain: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("players.id", use_alter=True, name="fk_team_captain_id"), 
        nullable=True
    )

    players: Mapped[List["PlayerModel"]] = relationship(
        "PlayerModel", 
        back_populates="team",
        foreign_keys=[PlayerModel.team_id]
    )
    
    # CORREÇÃO 3: Relacionamento para acessar o objeto do Capitão
    captain: Mapped[Optional["PlayerModel"]] = relationship(
        "PlayerModel",
        foreign_keys=[team_captain],
        post_update=True
    )