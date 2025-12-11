from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.services.competition_generator import StructureGeneratorService

from src.routes.routes import get_session

router = APIRouter(prefix="/competitions", tags=["competitions"])

@router.post("/{competition_id}/generate-structure", status_code=status.HTTP_200_OK)
async def generate_structure(
    competition_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Gera Rounds, Matches, Segments e Standings iniciais.
    Muda o status da competição para ACTIVE.
    """
    service = StructureGeneratorService(session)
    return await service.generate_structure(competition_id)