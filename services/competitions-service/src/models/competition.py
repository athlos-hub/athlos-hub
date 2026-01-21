from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from src.models.base import Base

if TYPE_CHECKING:
    from modality import ModalityModel
    from sport_ruleset import SportRulesetModel


class CompetitionStatus(str, enum.Enum):
    PENDING = "pending"
    STARTED = "started"
    FINISHED = "finished"

class CompetitionSystem(str, enum.Enum):
    POINTS = "points"
    ELIMINATION = "elimination"
    MIXED = "mixed"

class CompetitionModel(Base):
    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    modality_id: Mapped[int] = mapped_column(ForeignKey("modalities.id"))
    
    name: Mapped[str] = mapped_column(String(100))
    status: Mapped[CompetitionStatus] = mapped_column(String, default="PENDING")
    sport_ruleset_id: Mapped[int] = mapped_column(ForeignKey("sport_rulesets.id"))

    start_date: Mapped[datetime]
    end_date: Mapped[datetime]
    
    # Configs
    system: Mapped[CompetitionSystem] = mapped_column(String, default="POINTS")
    min_members_per_team: Mapped[int] = mapped_column(Integer, default=5)
    max_members_per_team: Mapped[int] = mapped_column(Integer, default=20)
    
    teams_per_group: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    teams_qualified_per_group: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    image: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Relacionamentos
    # Note que importamos classes dentro de strings ou TYPE_CHECKING para evitar ciclo
    modality: Mapped["ModalityModel"] = relationship(
        "ModalityModel", 
        back_populates="competitions"
    )
    
    sport_ruleset: Mapped["SportRulesetModel"] = relationship(
        "SportRulesetModel", 
        back_populates="competitions"
    )