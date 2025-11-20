import asyncio
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from ..services.auth_service import AuthService
from database.client import db
import logging

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "checks": {}
    }

    try:
        await asyncio.wait_for(db.check_health(), timeout=5.0)
        health_status["checks"]["database"] = "ok"
    except asyncio.TimeoutError:
        logger.error("Timeout ao tentar conectar no banco de dados.")
        health_status["checks"]["database"] = "error: connection timeout"
        health_status["status"] = "unhealthy"
    except Exception as e:
        logger.error(f"Erro no health check do banco: {e}")
        health_status["checks"]["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    try:
        await asyncio.wait_for(AuthService.get_public_key(), timeout=5.0)
        health_status["checks"]["keycloak"] = "ok"
    except asyncio.TimeoutError:
        health_status["checks"]["keycloak"] = "error: request timeout"
        health_status["status"] = "unhealthy"
    except Exception as e:
        health_status["checks"]["keycloak"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    status_code = status.HTTP_200_OK if health_status["status"] == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(content=health_status, status_code=status_code)