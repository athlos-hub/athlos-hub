"""Rotas internas (serviço a serviço), sem JWT — rede privada / gateway."""

import logging

from fastapi import APIRouter, Response

from shared.database.client import db
from src.services.profiles.profiles_service import delete_team_social_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal"])


@router.delete("/team-profiles/{team_id}", status_code=204)
async def internal_delete_team_profile(team_id: str):
    """
    Remove perfil e conteúdo social do time. team_id = UUID do time no competitions-service.
    Chamado pelo competitions ao excluir o espelho do time.
    """
    tid = (team_id or "").strip()
    if not tid:
        return Response(status_code=204)
    async with db.session() as session:
        await delete_team_social_data(session, tid)
    logger.info("Perfil social removido (internal) para team_id=%s", tid)
    return Response(status_code=204)
