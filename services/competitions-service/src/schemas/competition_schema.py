from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime
from typing import Optional, List
import uuid

from src.models.competition import CompetitionStatus, CompetitionSystem
from src.schemas.sport_ruleset_schema import SportRulesetCreate, SportRulesetResponse
from src.schemas.stats_ruleset_schema import StatsRuleSetForCompetition, StatsRuleSetResponse


class CompetitionBase(BaseModel):
    name: str = Field(..., max_length=100, description="Nome da competição")
    modality_id: int = Field(..., description="ID da modalidade associada")
    
    start_date: datetime = Field(..., description="Data de início")
    end_date: datetime = Field(..., description="Data de término")
    
    system: CompetitionSystem = Field(default=CompetitionSystem.POINTS, description="Sistema de disputa")
    
    min_members_per_team: int = Field(default=5, ge=1, description="Mínimo de jogadores por time")
    max_members_per_team: int = Field(default=20, ge=1, description="Máximo de jogadores por time")
    
    image: Optional[str] = Field(None, description="URL da imagem da competição")

    teams_qualified_per_group: Optional[int] = Field(
        None, ge=1, description="Número de times classificados por grupo (se aplicável)"
    )
    teams_per_group: Optional[int] = Field(
        None, ge=1, description="Número de times por grupo (se aplicável)"
    )

class CompetitionCreate(CompetitionBase):
    """
    Schema de criação flexível:
    1. Sport Ruleset: OPCIONAL - Pode criar NOVO (ruleset) ou REUSAR (sport_ruleset_id)
    2. Stats Ruleset: OPCIONAL - Pode criar NOVO (stats_ruleset) ou REUSAR (stats_ruleset_id)
    """
    # Sport Ruleset (opcional)
    ruleset: Optional[SportRulesetCreate] = Field(
        None, 
        description="Objeto para criar um NOVO conjunto de regras esportivas"
    )
    sport_ruleset_id: Optional[int] = Field(
        None, 
        description="ID de um sport ruleset JÁ EXISTENTE para reutilizar"
    )
    
    # Stats Ruleset (opcional)
    stats_ruleset: Optional[StatsRuleSetForCompetition] = Field(
        None,
        description="Objeto para criar um NOVO conjunto de estatísticas junto com a competição"
    )
    stats_ruleset_id: Optional[int] = Field(
        None,
        description="ID de um stats ruleset JÁ EXISTENTE para vincular à competição"
    )

    @model_validator(mode='after')
    def check_ruleset_presence(self):
        # Sport ruleset não é mais obrigatório, mas se fornecido deve ser apenas um
        if self.ruleset and self.sport_ruleset_id:
            raise ValueError('Forneça apenas "ruleset" OU "sport_ruleset_id", não ambos.')
        
        # Stats ruleset continua sendo opcional, mas apenas um pode ser fornecido
        if self.stats_ruleset and self.stats_ruleset_id:
            raise ValueError('Forneça apenas "stats_ruleset" OU "stats_ruleset_id", não ambos.')
        
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
    
    # Retorna o ID da regra vinculada (opcional)
    sport_ruleset_id: Optional[int] = None
    sport_ruleset: Optional[SportRulesetResponse] = None
    
    # Stats Ruleset (opcional)
    stats_ruleset: Optional[StatsRuleSetResponse] = None

    model_config = ConfigDict(from_attributes=True)


# Schemas para Teams com Players
class PlayerBasicResponse(BaseModel):
    id: uuid.UUID
    keycloak_id: uuid.UUID
    team_id: uuid.UUID
    # name e number podem vir do serviço de auth/users se necessário
    
    model_config = ConfigDict(from_attributes=True)


class TeamWithPlayersResponse(BaseModel):
    id: uuid.UUID
    name: str
    abbreviation: str
    players: List[PlayerBasicResponse] = []
    
    model_config = ConfigDict(from_attributes=True)