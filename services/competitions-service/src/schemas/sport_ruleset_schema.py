from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class SportRulesetBase(BaseModel):
    name: str = Field(..., max_length=50, description="Nome da regra (ex: Futsal Oficial)")
    segment_type: str = Field(..., max_length=20, description="Tipo de divisão (TIME, SET, QUARTER)")
    segments_regular_number: int = Field(default=2, ge=1, description="Número de tempos/sets regulares")
    overtime_segments: int = Field(default=0, ge=0, description="Número de tempos de prorrogação")
    penalty_segments: int = Field(default=0, ge=0, description="Número de séries de pênaltis")
    has_break_segments: bool = Field(default=True, description="Se existe intervalo entre segmentos")


class SportRulesetCreate(SportRulesetBase):
    pass


class SportRulesetUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    segment_type: Optional[str] = Field(None, max_length=20)
    segments_regular_number: Optional[int] = Field(None, ge=1)
    overtime_segments: Optional[int] = Field(None, ge=0)
    penalty_segments: Optional[int] = Field(None, ge=0)
    has_break_segments: Optional[bool] = None


class SportRulesetResponse(SportRulesetBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)
