"""
Rotas internas do competitions-service.

Rotas para comunicação entre serviços (não expostas ao público).
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.routes.routes import get_session
from src.schemas.internal_teams import (
    TeamCreatedResponse,
    TeamFromAuthPayload,
    TeamLogoSyncPayload,
)
from src.services.internal_teams_import_service import (
    import_team_from_auth,
    sync_team_logo_by_id,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal"])


@router.post("/teams", response_model=TeamCreatedResponse, status_code=201)
async def receive_approved_team(
    payload: TeamFromAuthPayload,
    session: AsyncSession = Depends(get_session),
):
    """Recebe um time aprovado do auth-service (HTTP)."""
    return await import_team_from_auth(session, payload)


@router.patch("/teams/{team_id}/logo", status_code=204)
async def sync_team_logo(
    team_id: UUID,
    payload: TeamLogoSyncPayload,
    session: AsyncSession = Depends(get_session),
):
    """Sincroniza URL do escudo (chamado pelo auth-service após upload/remoção)."""
    await sync_team_logo_by_id(session, team_id, payload.logo_url)
    await session.commit()
    return Response(status_code=204)


@router.get("/health")
async def internal_health():
    """Health check interno."""
    return {"status": "ok", "service": "competitions-service", "type": "internal"}
