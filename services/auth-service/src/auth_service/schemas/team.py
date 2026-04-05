"""
Schemas para Teams no auth-service.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ==================== Team Schemas ====================

class TeamCreateRequest(BaseModel):
    """Request para criar um novo time."""

    model_config = ConfigDict(extra="ignore")

    organization_slug: str = Field(..., description="Slug da organização")
    competition_id: UUID = Field(..., description="ID da competição no competitions-service (UUID)")
    competition_name: str = Field(..., description="Nome da competição (para exibição)")
    name: str = Field(..., max_length=100, description="Nome do time")
    abbreviation: str = Field(..., max_length=3, description="Abreviação/sigla do time")
    min_members: int = Field(default=1, ge=1, description="Mínimo de membros para aprovação")
    max_members: int = Field(default=20, ge=1, description="Máximo de membros permitido")


class TeamUpdateRequest(BaseModel):
    """Request para atualizar um time."""
    name: Optional[str] = Field(None, max_length=100)
    abbreviation: Optional[str] = Field(None, max_length=3)


class TeamMemberUser(BaseModel):
    """Dados do usuário dentro do membro do time."""
    id: UUID
    keycloak_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TeamMemberResponse(BaseModel):
    """Response de membro do time."""
    id: UUID
    team_id: UUID
    user_id: UUID
    is_captain: bool
    joined_at: datetime
    user: TeamMemberUser

    model_config = ConfigDict(from_attributes=True)


class TeamResponse(BaseModel):
    """Response básico de time."""
    id: UUID
    organization_id: UUID
    organization_slug: str
    organization_name: Optional[str] = None
    competition_id: UUID = Field(..., description="ID da competição no competitions-service")
    competition_name: str
    name: str
    abbreviation: str
    logo_url: Optional[str] = None
    status: str
    captain_id: str
    min_members: int
    max_members: int
    member_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeamDetailResponse(TeamResponse):
    """Response detalhado de time com membros."""
    members: list[TeamMemberResponse] = []
    external_team_id: Optional[UUID] = None


class TeamListItemResponse(BaseModel):
    """Item para listagem de times."""
    id: UUID
    organization_slug: str
    organization_name: Optional[str] = None
    competition_id: UUID = Field(..., description="ID da competição no competitions-service")
    competition_name: str
    name: str
    abbreviation: str
    logo_url: Optional[str] = None
    status: str
    player_count: int
    role: str  # CAPTAIN ou PLAYER
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==================== Team Invite Schemas ====================

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


class TeamInviteResponse(BaseModel):
    """Response de convite de time."""
    id: UUID
    team_id: UUID
    invite_token: str
    invite_url: str
    expires_at: datetime
    status: str
    max_uses: Optional[int]
    use_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InviteValidationResponse(BaseModel):
    """Response de validação de convite."""
    valid: bool
    team_id: Optional[UUID] = None
    team_name: Optional[str] = None
    organization_name: Optional[str] = None
    competition_name: Optional[str] = None
    message: Optional[str] = None


class AcceptInviteResponse(BaseModel):
    """Response de aceitação de convite."""
    success: bool
    team_id: UUID
    team_name: str
    message: str
    added_to_organization: bool = False


# ==================== Team Approval Schemas ====================

class TeamApprovalRequest(BaseModel):
    """Request para aprovar um time (enviar para competitions-service)."""
    pass  # Pode ser expandido se necessário


class TeamApprovalResponse(BaseModel):
    """Response de aprovação de time."""
    success: bool
    team_id: UUID
    external_team_id: UUID
    message: str


class TeamRejectionRequest(BaseModel):
    """Request para rejeitar um time."""
    reason: Optional[str] = Field(None, max_length=500, description="Motivo da rejeição")


# ==================== Internal Schemas (para comunicação entre serviços) ====================

class PlayerPayload(BaseModel):
    """Payload de jogador para enviar ao competitions-service."""
    keycloak_id: str


class TeamApprovalPayload(BaseModel):
    """Payload enviado ao competitions-service quando um time é aprovado."""
    organization_slug: str
    competition_id: UUID
    name: str
    abbreviation: str
    captain_keycloak_id: str
    players: list[PlayerPayload]
    logo_url: Optional[str] = None
    auth_team_id: UUID = Field(..., description="ID do time no auth-service (links / referência cruzada)")
