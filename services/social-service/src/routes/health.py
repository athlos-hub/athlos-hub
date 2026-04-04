from datetime import datetime

from fastapi import APIRouter

router = APIRouter(tags=["social"])


@router.get("/health")
async def health():
    return {
        "status": "UP",
        "service": "social-service",
        "timestamp": datetime.now().isoformat(),
        "message": "Social Service está rodando!",
    }


@router.get("/info")
async def info():
    return {
        "service": "social-service",
        "version": "0.1.0",
        "description": "Serviço de rede social para AthlosHub (FastAPI)",
        "features": [
            "Perfil de Atleta",
            "Feed Esportivo",
            "Interação Social (Likes, Comentários)",
            "Integração com Auth Service",
        ],
    }
