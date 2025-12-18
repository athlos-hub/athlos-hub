from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime
from typing import Optional

from src.models.competition import CompetitionStatus, CompetitionSystem


class SportRulesetBase(BaseModel):
    name: str = Field(..., max_length=50, description="Nome da regra (ex: Futsal Oficial)")
    segment_type: str = Field(..., max_length=20, description="Tipo de divisão (TIME, SET, QUARTER)")
    segments_regular_number: int = Field(default=2, ge=1, description="Número de tempos/sets regulares")
    overtime_segments: int = Field(default=0, ge=0, description="Número de tempos de prorrogação")
    penalty_segments: int = Field(default=0, ge=0, description="Número de séries de pênaltis")
    has_break_segments: bool = Field(default=True, description="Se existe intervalo entre segmentos")

class SportRulesetCreate(SportRulesetBase):
    pass

class SportRulesetResponse(SportRulesetBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class CompetitionBase(BaseModel):
    name: str = Field(..., max_length=100, description="Nome da competição")
    modality_id: int = Field(..., description="ID da modalidade associada")
    
    start_date: datetime = Field(..., description="Data de início")
    end_date: datetime = Field(..., description="Data de término")
    
    system: CompetitionSystem = Field(default=CompetitionSystem.POINTS, description="Sistema de disputa")
    
    min_members_per_team: int = Field(default=5, ge=1, description="Mínimo de jogadores por time")
    max_members_per_team: int = Field(default=20, ge=1, description="Máximo de jogadores por time")
    
    image: Optional[str] = Field(None, description="URL da imagem da competição")

class CompetitionCreate(CompetitionBase):
    """
    Schema de criação flexível:
    1. Pode criar um Ruleset NOVO (passando 'ruleset')
    2. Pode REUSAR um Ruleset existente (passando 'sport_ruleset_id')
    """
    ruleset: Optional[SportRulesetCreate] = Field(
        None, 
        description="Objeto para criar um NOVO conjunto de regras exclusivo"
    )
    sport_ruleset_id: Optional[int] = Field(
        None, 
        description="ID de um conjunto de regras JÁ EXISTENTE para reutilizar"
    )

    @model_validator(mode='after')
    def check_ruleset_presence(self):
        if not self.ruleset and not self.sport_ruleset_id:
            raise ValueError('Você deve fornecer um novo "ruleset" ou um "sport_ruleset_id" existente.')
        return self

class CompetitionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[CompetitionStatus] = None
    min_members_per_team: Optional[int] = None
    max_members_per_team: Optional[int] = None
    

class CompetitionResponse(CompetitionBase):
    id: int
    status: CompetitionStatus
    
    # Retorna o ID da regra vinculada
    sport_ruleset_id: int    
    sport_ruleset: Optional[SportRulesetResponse] = None

    model_config = ConfigDict(from_attributes=True)