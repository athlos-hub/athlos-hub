"""
Rotas internas do competitions-service.

Rotas para comunicação entre serviços (não expostas ao público).
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Response

from shared.database.client import db
from src.infrastructure.messaging.social_team_profile_publisher import (
    publish_team_profile_ensure,
)
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
):
    """Recebe um time aprovado do auth-service (HTTP)."""
    async with db.session() as session:
        result = await import_team_from_auth(session, payload)
    await publish_team_profile_ensure(
        team_id=str(result.id),
        organization_slug=payload.organization_slug,
        approved_for_social=True,
    )
    return result


@router.patch("/teams/{team_id}/logo", status_code=204)
async def sync_team_logo(
    team_id: UUID,
    payload: TeamLogoSyncPayload,
):
    """Sincroniza URL do escudo (chamado pelo auth-service após upload/remoção)."""
    async with db.session() as session:
        await sync_team_logo_by_id(session, team_id, payload.logo_url)
    return Response(status_code=204)


@router.get("/health")
async def internal_health():
    """Health check interno."""
    return {"status": "ok", "service": "competitions-service", "type": "internal"}
