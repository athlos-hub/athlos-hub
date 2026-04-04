"""Schemas para integração auth → competitions (HTTP interno ou RabbitMQ)."""

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PlayerPayload(BaseModel):
    keycloak_id: str


class TeamFromAuthPayload(BaseModel):
    organization_slug: str = Field(..., description="Slug da organização")
    competition_id: UUID = Field(..., description="ID da competição")
    name: str = Field(..., description="Nome do time")
    abbreviation: str = Field(..., description="Abreviação/sigla do time")
    captain_keycloak_id: str = Field(..., description="Keycloak ID do capitão")
    players: List[PlayerPayload] = Field(..., description="Lista de jogadores")
    logo_url: Optional[str] = Field(None, description="URL do escudo (mesma do auth-service)")
    auth_team_id: UUID = Field(..., description="ID do time no auth-service")


class TeamCreatedResponse(BaseModel):
    id: UUID
    name: str
    status: str
    competition_id: UUID


class TeamLogoSyncPayload(BaseModel):
    logo_url: Optional[str] = Field(None, description="URL pública do escudo ou null para remover")
