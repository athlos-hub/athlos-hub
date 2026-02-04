from pydantic import BaseModel, Field, ConfigDict
import uuid
from typing import List, Optional
from datetime import datetime

# --- Players ---
class PlayerCreateSchema(BaseModel):
    keycloak_id: uuid.UUID = Field(..., description="Keycloak ID do usuário que será o jogador")

class PlayerResponseSchema(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    keycloak_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class TeamBaseSchema(BaseModel):
    organization_slug: str = Field(..., description="Slug da organização")
    competition_id: int = Field(..., description="ID da competição")
    name: str = Field(..., description="Nome do time", max_length=100)
    abbreviation: str = Field(..., description="Abreviação (SIGLA)", max_length=3)
    
    captain_keycloak_id: uuid.UUID = Field(..., description="Keycloak ID do capitão (deve estar na lista de players)")
    
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


# --- Team Invites ---
class CreateInviteRequest(BaseModel):
    """Request para criar um convite de time."""
    expires_in_days: int = Field(
        default=7, 
        ge=1, 
        le=30, 
        description="Dias até o convite expirar (1-30)"
    )
    max_uses: Optional[int] = Field(
        default=None, 
        ge=1, 
        description="Número máximo de usos (None = ilimitado)"
    )


class InviteResponseSchema(BaseModel):
    """Response com dados do convite."""
    id: uuid.UUID
    team_id: uuid.UUID
    invite_token: str
    invite_url: str = Field(description="URL completa para aceitar o convite")
    created_by: uuid.UUID
    status: str
    expires_at: datetime
    max_uses: Optional[int]
    use_count: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class AcceptInviteRequest(BaseModel):
    """Request para aceitar um convite."""
    invite_token: str = Field(..., description="Token do convite")


class AcceptInviteResponse(BaseModel):
    """Response após aceitar convite."""
    message: str
    team_id: uuid.UUID
    team_name: str
    player_id: uuid.UUID
    competition_id: int


class InviteValidationResponse(BaseModel):
    """Response para validar um convite (preview antes de aceitar)."""
    valid: bool
    team_id: Optional[uuid.UUID] = None
    team_name: Optional[str] = None
    organization_slug: Optional[str] = None
    competition_id: Optional[int] = None
    competition_name: Optional[str] = None
    expires_at: Optional[datetime] = None
    remaining_uses: Optional[int] = None  # None = ilimitado
    error: Optional[str] = None


# --- User Teams ---
class TeamRole(str):
    CAPTAIN = "CAPTAIN"
    PLAYER = "PLAYER"


class TeamListItemSchema(BaseModel):
    """Schema para listagem de times do usuário."""
    id: uuid.UUID
    name: str
    abbreviation: str
    status: str
    organization_slug: str
    competition_id: int
    team_captain: Optional[uuid.UUID] = None
    created_at: datetime
    competition_name: Optional[str] = None
    organization_name: Optional[str] = None
    player_count: Optional[int] = None
    role: str  # CAPTAIN ou PLAYER
    
    model_config = ConfigDict(from_attributes=True)


class TeamDetailSchema(BaseModel):
    """Schema detalhado de um time."""
    id: uuid.UUID
    name: str
    abbreviation: str
    status: str
    organization_slug: str
    competition_id: int
    team_captain: Optional[uuid.UUID] = None
    created_at: datetime
    competition_name: str
    organization_name: Optional[str] = None
    modality_name: Optional[str] = None
    players: List[PlayerResponseSchema]
    role: Optional[str] = None  # CAPTAIN, PLAYER ou None se não for membro
    
    model_config = ConfigDict(from_attributes=True)