"""
Rotas internas do competitions-service.

Rotas para comunicação entre serviços (não expostas ao público).
"""
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.routes.routes import get_session
from src.models.teams import TeamModel, PlayerModel, TeamStatus
from src.models.competition import CompetitionModel, CompetitionStatus
from src.schemas.teams_schema import TeamResponseSchema, PlayerResponseSchema

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal"])


# ==================== Schemas ====================

class PlayerPayload(BaseModel):
    """Payload de jogador vindo do auth-service."""
    keycloak_id: str


class TeamFromAuthPayload(BaseModel):
    """Payload de time aprovado vindo do auth-service."""
    organization_slug: str = Field(..., description="Slug da organização")
    competition_id: UUID = Field(..., description="ID da competição")
    name: str = Field(..., description="Nome do time")
    abbreviation: str = Field(..., description="Abreviação/sigla do time")
    captain_keycloak_id: str = Field(..., description="Keycloak ID do capitão")
    players: List[PlayerPayload] = Field(..., description="Lista de jogadores")
    logo_url: Optional[str] = Field(None, description="URL do escudo (mesma do auth-service)")
    auth_team_id: UUID = Field(..., description="ID do time no auth-service")


class TeamCreatedResponse(BaseModel):
    """Response de time criado."""
    id: UUID
    name: str
    status: str
    competition_id: UUID


class TeamLogoSyncPayload(BaseModel):
    """Sincroniza escudo vindo do auth após aprovação ou edição."""
    logo_url: Optional[str] = Field(None, description="URL pública do escudo ou null para remover")


# ==================== Endpoints ====================

@router.post("/teams", response_model=TeamCreatedResponse, status_code=201)
async def receive_approved_team(
    payload: TeamFromAuthPayload,
    session: AsyncSession = Depends(get_session),
):
    """
    Recebe um time aprovado do auth-service.
    
    Este endpoint é chamado pelo auth-service quando um time é aprovado.
    Realiza validações e cria o time no competitions-service.
    """
    logger.info(f"Recebendo time aprovado: {payload.name} para competição {payload.competition_id}")

    # 1. Validar competição
    query = select(CompetitionModel).where(CompetitionModel.id == payload.competition_id)
    result = await session.execute(query)
    competition = result.scalar_one_or_none()

    if not competition:
        logger.warning(f"Competição {payload.competition_id} não encontrada")
        raise HTTPException(
            status_code=404,
            detail=f"Competição {payload.competition_id} não encontrada"
        )

    # Verificar se competição aceita inscrições (PENDING)
    if competition.status != CompetitionStatus.PENDING:
        logger.warning(f"Competição {payload.competition_id} não está aberta para inscrições")
        raise HTTPException(
            status_code=400,
            detail="Competição não está aberta para inscrições"
        )

    # 2. Validar número de jogadores
    num_players = len(payload.players)
    if num_players < competition.min_members_per_team:
        raise HTTPException(
            status_code=400,
            detail=f"Mínimo de {competition.min_members_per_team} jogadores requerido. Fornecido: {num_players}"
        )

    if num_players > competition.max_members_per_team:
        raise HTTPException(
            status_code=400,
            detail=f"Máximo de {competition.max_members_per_team} jogadores permitido. Fornecido: {num_players}"
        )

    # 3. Verificar se capitão está na lista
    captain_in_list = any(p.keycloak_id == payload.captain_keycloak_id for p in payload.players)
    if not captain_in_list:
        raise HTTPException(
            status_code=400,
            detail="Capitão deve estar na lista de jogadores"
        )

    # 4. Verificar se algum jogador já está em outro time da competição
    player_keycloak_ids = [p.keycloak_id for p in payload.players]
    existing_players_query = (
        select(PlayerModel)
        .join(TeamModel, PlayerModel.team_id == TeamModel.id)
        .where(
            TeamModel.competition_id == payload.competition_id,
            PlayerModel.keycloak_id.in_(player_keycloak_ids)
        )
    )
    result = await session.execute(existing_players_query)
    existing_players = result.scalars().all()

    if existing_players:
        duplicates = [str(p.keycloak_id) for p in existing_players]
        logger.warning(f"Jogadores já inscritos na competição: {duplicates}")
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Alguns jogadores já estão em outros times desta competição",
                "duplicate_players": duplicates
            }
        )

    # 5. Verificar se já existe time com mesmo nome
    existing_team_query = (
        select(TeamModel)
        .where(
            TeamModel.competition_id == payload.competition_id,
            TeamModel.organization_slug == payload.organization_slug,
            TeamModel.name == payload.name
        )
    )
    result = await session.execute(existing_team_query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Já existe um time com nome '{payload.name}' nesta competição"
        )

    # 6. Criar time
    new_team = TeamModel(
        organization_slug=payload.organization_slug,
        competition_id=payload.competition_id,
        name=payload.name,
        abbreviation=payload.abbreviation,
        logo_url=payload.logo_url,
        auth_team_id=payload.auth_team_id,
        status=TeamStatus.ACTIVE,  # Já aprovado pelo auth, então ACTIVE
        team_captain=None  # Será atualizado após criar jogadores
    )
    session.add(new_team)
    await session.flush()

    # 7. Criar jogadores
    captain_player = None
    for player_data in payload.players:
        new_player = PlayerModel(
            team_id=new_team.id,
            keycloak_id=player_data.keycloak_id
        )
        session.add(new_player)

        if player_data.keycloak_id == payload.captain_keycloak_id:
            captain_player = new_player

    await session.flush()

    # 8. Atualizar capitão
    if captain_player:
        new_team.team_captain = captain_player.id
        session.add(new_team)

    await session.commit()

    logger.info(f"Time '{payload.name}' criado com sucesso. ID: {new_team.id}")

    return TeamCreatedResponse(
        id=new_team.id,
        name=new_team.name,
        status=new_team.status.value if hasattr(new_team.status, 'value') else str(new_team.status),
        competition_id=new_team.competition_id
    )


@router.patch("/teams/{team_id}/logo", status_code=204)
async def sync_team_logo(
    team_id: UUID,
    payload: TeamLogoSyncPayload,
    session: AsyncSession = Depends(get_session),
):
    """Sincroniza URL do escudo (chamado pelo auth-service após upload/remoção)."""
    team = await session.get(TeamModel, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado")
    team.logo_url = payload.logo_url
    await session.commit()
    return Response(status_code=204)


@router.get("/health")
async def internal_health():
    """Health check interno."""
    return {"status": "ok", "service": "competitions-service", "type": "internal"}
