from pydantic import BaseModel, Field, ConfigDict
import uuid
from typing import List, Optional
from datetime import datetime

# --- Players ---
class PlayerCreateSchema(BaseModel):
    user_id: uuid.UUID = Field(..., description="ID do usuário (Auth) que será o jogador")

class PlayerResponseSchema(PlayerCreateSchema):
    id: uuid.UUID
    team_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class TeamBaseSchema(BaseModel):
    org_code: str = Field(..., description="Código da organização")
    competition_id: int = Field(..., description="ID da competição")
    name: str = Field(..., description="Nome do time", max_length=100)
    abbreviation: str = Field(..., description="Abreviação (SIGLA)", max_length=3)
    
    captain_user_id: uuid.UUID = Field(..., description="User ID do capitão (deve estar na lista de players)")
    
    players: List[PlayerCreateSchema] = Field(..., min_length=1, description="Lista inicial de jogadores")

class TeamCreateSchema(TeamBaseSchema):
    pass

class TeamResponseSchema(BaseModel):
    id: uuid.UUID
    name: str
    abbreviation: str
    status: str
    competition_id: int
    team_captain: Optional[uuid.UUID] = None
    players: List[PlayerResponseSchema]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)