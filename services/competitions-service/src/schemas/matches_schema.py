from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
import uuid
from enum import Enum

from src.models.matches import MatchStatus

# Enum para o filtro de período
class MatchPeriodFilter(str, Enum):
    TODAY = "today"
    WEEK = "week"
    ALL = "all"

# Schema resumido do Time (para não trazer players, etc)
class TeamSummary(BaseModel):
    id: uuid.UUID
    name: str
    abbreviation: str
    model_config = ConfigDict(from_attributes=True)

class MatchOrgResponse(BaseModel):
    id: uuid.UUID
    status: MatchStatus
    scheduled_datetime: Optional[datetime]
    local: Optional[str]
    round_match_number: int
    
    # Dados agregados
    competition_name: str
    modality_name: str
    
    # Times (podem ser null se for placeholder)
    home_team: Optional[TeamSummary] = None
    away_team: Optional[TeamSummary] = None
    
    # Placar
    home_score: int
    away_score: int

    model_config = ConfigDict(from_attributes=True)

class RoundSummary(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class MatchResponse(BaseModel):
    id: uuid.UUID
    status: MatchStatus
    scheduled_datetime: Optional[datetime]
    local: Optional[str]
    round_match_number: int
    
    # Placar
    home_score: int
    away_score: int

    # Relacionamentos
    home_team: Optional[TeamSummary] = None
    away_team: Optional[TeamSummary] = None
    round: Optional[RoundSummary] = None  # Importante para contexto de competição

    model_config = ConfigDict(from_attributes=True)

class MatchUpdateRequest(BaseModel):
    scheduled_datetime: Optional[datetime] = Field(None, description="Nova data e hora do jogo (ISO 8601)")
    local: Optional[str] = Field(None, description="Novo local da partida")

    model_config = ConfigDict(from_attributes=True)


# Novo: Enum e Schema para registrar pontuação
class TeamSide(str, Enum):
    home = "home"
    away = "away"

class ScoreUpdateRequest(BaseModel):
    team_side: TeamSide = Field(..., description="Lado do time que pontuou: 'home' ou 'away'")
    increment: int = Field(1, ge=0, description="Valor a incrementar no placar (>= 0)")
    segment_id: Optional[int] = Field(None, description="ID do segmento (se o jogo for segmentado)")

    # Métrica de stats (obrigatória se a competição possuir StatsRuleSet)
    stats_metric_abbreviation: Optional[str] = Field(None, description="Abreviação da métrica (ex: 'GOL', 'PTS')")
    player_id: Optional[uuid.UUID] = Field(None, description="ID do jogador que realizou a pontuação")

    model_config = ConfigDict(from_attributes=True)


# Novo: Schema para setar placar específico
class SegmentScoreInput(BaseModel):
    segment_id: int
    home_score: int = Field(ge=0)
    away_score: int = Field(ge=0)

class StatsEventInput(BaseModel):
    player_id: uuid.UUID
    abbreviation: str
    value: int = Field(ge=0)

class SetScoreRequest(BaseModel):
    home_score: int = Field(..., ge=0)
    away_score: int = Field(..., ge=0)
    segments: Optional[List[SegmentScoreInput]] = None
    stats_events: Optional[List[StatsEventInput]] = None

    model_config = ConfigDict(from_attributes=True)