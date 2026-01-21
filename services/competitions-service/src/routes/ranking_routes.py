from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List


from src.routes.routes import get_session

router = APIRouter(prefix="/rankings", tags=["rankings"])

@router.get(
    "/players/{competition_id}/{stats_metric_abbreviation}",
    response_model=List[dict],
    summary="Obter ranking de jogadores por métrica em uma competição"
)
async def get_player_rankings(
    competition_id: int,
    stats_metric_abbreviation: str,
    limit: int = None,
    session: AsyncSession = Depends(get_session)
):
    """
    Retorna o ranking de jogadores para uma métrica específica dentro de uma competição.
    Permite limitar o número de resultados retornados.
    """
    from src.services.stats_service import StatsService

    stats_service = StatsService(session)
    rankings = await stats_service.get_player_rankings(
        competition_id=competition_id,
        stats_metric_abbreviation=stats_metric_abbreviation,
        limit=limit
    )
    
    return rankings