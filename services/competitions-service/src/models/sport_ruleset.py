from sqlalchemy import String, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from src.models.base import Base

if TYPE_CHECKING:
    from competitions import CompetitionModel

class SportRulesetModel(Base):
    __tablename__ = "sport_rulesets"

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), unique=True)
    
    name: Mapped[str] = mapped_column(String(50))
    
    # Regras de tempo/sets
    segment_type: Mapped[str] = mapped_column(String(20)) # TIME, SET, QUARTER
    segments_regular_number: Mapped[int] = mapped_column(Integer, default=2)
    overtime_segments: Mapped[int] = mapped_column(Integer, default=0)
    penalty_segments: Mapped[int] = mapped_column(Integer, default=0)
    
    has_break_segments: Mapped[bool] = mapped_column(Boolean, default=True)

    # Back Reference
    competition: Mapped["CompetitionModel"] = relationship(back_populates="sport_ruleset")