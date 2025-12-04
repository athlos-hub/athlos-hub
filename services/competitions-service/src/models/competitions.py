from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from src.models.base import Base

if TYPE_CHECKING:
    from modalities import ModalityModel
    from sport_ruleset import SportRulesetModel

class CompetitionSystem(str, enum.Enum):
    POINTS = "points"
    ELIMINATION = "elimination"
    MIXED = "mixed"

class CompetitionModel(Base):
    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    modality_id: Mapped[int] = mapped_column(ForeignKey("modalities.id"))
    
    name: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    
    start_date: Mapped[datetime]
    end_date: Mapped[datetime]
    
    # Configs
    system: Mapped[CompetitionSystem] = mapped_column(String)
    min_members_per_team: Mapped[int] = mapped_column(Integer, default=5)
    max_members_per_team: Mapped[int] = mapped_column(Integer, default=20)
    
    image: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Relacionamentos
    # Note que importamos classes dentro de strings ou TYPE_CHECKING para evitar ciclo
    modality: Mapped["ModalityModel"] = relationship(
        "ModalityModel", 
        back_populates="competitions"
    )
    
    sport_ruleset: Mapped["SportRulesetModel"] = relationship(
        "SportRulesetModel", 
        back_populates="competition"
    )