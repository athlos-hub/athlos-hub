from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, TYPE_CHECKING

from src.models.base import Base

if TYPE_CHECKING:
    from competition import CompetitionModel

class ModalityModel(Base):
    __tablename__ = "modalities"

    id: Mapped[int] = mapped_column(primary_key=True)
    org_code: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String(50))
    

    competitions: Mapped[List["CompetitionModel"]] = relationship(
        "CompetitionModel", 
        back_populates="modality"
    )