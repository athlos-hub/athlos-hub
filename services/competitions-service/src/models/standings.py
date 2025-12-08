import uuid
from sqlalchemy import Integer, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, Optional

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.competition import CompetitionModel
    from src.models.teams import TeamModel
    from src.models.matches import GroupModel

class ClassificationModel(Base):
    __tablename__ = "classifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("groups.id"), nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=0)
    games_played: Mapped[int] = mapped_column(Integer, default=0)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    draws: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    score_pro: Mapped[int] = mapped_column(Integer, default=0) 
    score_against: Mapped[int] = mapped_column(Integer, default=0) 
    score_balance: Mapped[int] = mapped_column(Integer, default=0) 

    team: Mapped["TeamModel"] = relationship("TeamModel")
    group: Mapped["GroupModel"] = relationship("GroupModel")