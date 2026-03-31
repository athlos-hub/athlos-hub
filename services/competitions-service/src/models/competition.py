from datetime import datetime
import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from src.models.base import Base

if TYPE_CHECKING:
    from modality import ModalityModel
    from sport_ruleset import SportRulesetModel
    from stats import StatsRuleSetModel


class CompetitionStatus(str, enum.Enum):
    PENDING = "pending"
    STARTED = "started"
    FINISHED = "finished"

class CompetitionSystem(str, enum.Enum):
    POINTS = "points"
    ELIMINATION = "elimination"
    MIXED = "mixed"

class CompetitionPhase(str, enum.Enum):
    GROUPS = "groups"
    ELIMINATION = "elimination"

class CompetitionModel(Base):
    __tablename__ = "competitions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    modality_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("modalities.id"))
    
    name: Mapped[str] = mapped_column(String(100))
    status: Mapped[CompetitionStatus] = mapped_column(String, default="PENDING")
    sport_ruleset_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("sport_rulesets.id"), nullable=True)

    start_date: Mapped[datetime]
    end_date: Mapped[datetime]
    
    # Configs
    system: Mapped[CompetitionSystem] = mapped_column(String, default="POINTS")
    min_members_per_team: Mapped[int] = mapped_column(Integer, default=5)
    max_members_per_team: Mapped[int] = mapped_column(Integer, default=20)
    
    teams_per_group: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    teams_qualified_per_group: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    image: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    current_phase: Mapped[Optional[CompetitionPhase]] = mapped_column(String, nullable=True)
    
    # Relacionamentos
    # Note que importamos classes dentro de strings ou TYPE_CHECKING para evitar ciclo
    modality: Mapped["ModalityModel"] = relationship(
        "ModalityModel", 
        back_populates="competitions"
    )
    
    sport_ruleset: Mapped[Optional["SportRulesetModel"]] = relationship(
        "SportRulesetModel", 
        back_populates="competitions"
    )
    
    stats_ruleset: Mapped[Optional["StatsRuleSetModel"]] = relationship(
        "StatsRuleSetModel",
        back_populates="competition",
        uselist=False
    )
    
    @property
    def organization_slug(self) -> Optional[str]:
        """Retorna o organization_slug da modalidade associada."""
        return self.modality.organization_slug if self.modality else None