"""Rotas de health na nova estrutura."""

import logging

from fastapi import APIRouter

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    """Health check."""
    return {"status": "ok", "service": "auth-service"}

