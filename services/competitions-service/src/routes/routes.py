from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database.client import db
from sqlalchemy.ext.asyncio import AsyncSession
import json
import base64

security = HTTPBearer()

async def get_session() -> AsyncSession:
    async with db.session() as session:
        yield session

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Extrai as claims do token JWT do usuário atual
    Retorna um dict com as claims do token (sub, email, etc)
    Nota: Não valida a assinatura pois isso já é feito pelo gateway/Keycloak
    """
    token = credentials.credentials
    
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Token JWT inválido")
        
        payload_part = parts[1]
        padding = 4 - len(payload_part) % 4
        if padding != 4:
            payload_part += '=' * padding
        
        payload_bytes = base64.urlsafe_b64decode(payload_part)
        payload = json.loads(payload_bytes)
        
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Erro ao decodificar token: {str(e)}"
        )

from .modality_routes import router as modality_router
from .competitions_routes import router as competitions_router
from .team_routes import router as team_router
from .matches_routes import router as matches_router
from .health_routes import router as health_router
from .scoreboard_routes import router as scoreboard_router
from .ranking_routes import router as ranking_router
from .stats_ruleset_routes import router as stats_ruleset_router
from .sport_ruleset_routes import router as sport_ruleset_router
from .internal_routes import router as internal_router

router = APIRouter(prefix="/api/v1")

router.include_router(modality_router)
router.include_router(competitions_router)
router.include_router(team_router)
router.include_router(matches_router)
router.include_router(health_router)
router.include_router(scoreboard_router)
router.include_router(ranking_router)
router.include_router(stats_ruleset_router)
router.include_router(sport_ruleset_router)
router.include_router(internal_router)