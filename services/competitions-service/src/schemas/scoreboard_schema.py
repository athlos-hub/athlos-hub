from pydantic import BaseModel, Field
from typing import List
import uuid

class SegmentScoreSchema(BaseModel):
    """Schema para o placar de um segment individual"""
    segment_id: uuid.UUID = Field(..., description="ID do segment no banco")
    segment_number: int = Field(..., description="Número do segment (1, 2, 3...)")
    segment_type: str = Field(..., description="Tipo do segment (REGULAR, OVERTIME, PENALTY)")
    home_score: int = Field(default=0, description="Placar do time da casa neste segment")
    away_score: int = Field(default=0, description="Placar do time visitante neste segment")
    finished: bool = Field(default=False, description="Se o segment já foi finalizado")

class ScoreboardSchema(BaseModel):
    """Schema para o placar completo da partida"""
    match_id: uuid.UUID = Field(..., description="ID da partida")
    home_team_id: uuid.UUID | None = Field(None, description="ID do time da casa")
    away_team_id: uuid.UUID | None = Field(None, description="ID do time visitante")
    home_team_name: str | None = Field(None, description="Nome do time da casa")
    away_team_name: str | None = Field(None, description="Nome do time visitante")
    home_team_logo_url: str | None = Field(None, description="Logo URL time da casa")
    away_team_logo_url: str | None = Field(None, description="Logo URL time visitante")
    home_total_score: int = Field(default=0, description="Placar total do time da casa")
    away_total_score: int = Field(default=0, description="Placar total do time visitante")
    segments: List[SegmentScoreSchema] = Field(default_factory=list, description="Lista de segments com seus placares")
    status: str = Field(..., description="Status da partida")

class UpdateScoreRequest(BaseModel):
    """Schema para requisição de atualização de placar"""
    segment_number: int = Field(..., description="Número do segment a atualizar")
    home_score: int = Field(..., ge=0, description="Novo placar do time da casa")
    away_score: int = Field(..., ge=0, description="Novo placar do time visitante")
    finished: bool = Field(default=False, description="Se o segment foi finalizado")
