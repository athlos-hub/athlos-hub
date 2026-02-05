from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List


class StatsTypeBase(BaseModel):
    name: str = Field(..., max_length=100, description="Nome da estatística (ex: Gols, Faltas)")
    abbreviation: str = Field(..., max_length=20, description="Abreviação (ex: GOL, FLT)")
    description: Optional[str] = Field(None, max_length=500, description="Descrição da estatística")
    icon: Optional[str] = Field(None, max_length=50, description="Ícone para UI")
    display_order: Optional[int] = Field(None, description="Ordem de exibição")


class StatsTypeCreate(StatsTypeBase):
    pass


class StatsTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    abbreviation: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    display_order: Optional[int] = None


class StatsTypeResponse(StatsTypeBase):
    id: int
    stats_ruleset_id: int
    
    model_config = ConfigDict(from_attributes=True)


class StatsRuleSetBase(BaseModel):
    name: str = Field(..., max_length=255, description="Nome do conjunto de estatísticas")
    description: Optional[str] = Field(None, max_length=500, description="Descrição do conjunto")


class StatsRuleSetCreate(StatsRuleSetBase):
    stats_types: List[StatsTypeCreate] = Field(
        default_factory=list, 
        description="Lista de tipos de estatísticas para criar junto com o ruleset"
    )


class StatsRuleSetUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=500)


class StatsRuleSetResponse(StatsRuleSetBase):
    id: int
    competition_id: Optional[int] = None
    stats_types: List[StatsTypeResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


# Schema simplificado para usar na criação de competição
class StatsRuleSetForCompetition(BaseModel):
    """Schema simplificado para criar um stats ruleset junto com uma competição"""
    name: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    stats_types: List[StatsTypeCreate] = Field(default_factory=list)
