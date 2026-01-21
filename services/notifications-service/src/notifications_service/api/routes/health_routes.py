"""Rotas de health check."""

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check():
    """Verifica se o serviço está funcionando."""
    return {"status": "ok", "service": "notifications-service"}


@router.get("/ready")
async def readiness_check():
    """Verifica se o serviço está pronto para receber requisições."""
    return {"status": "ready", "service": "notifications-service"}
