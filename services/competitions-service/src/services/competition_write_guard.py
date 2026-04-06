from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.competition import CompetitionModel, CompetitionStatus

FINISHED_COMPETITION_MSG = "Competição finalizada: esta alteração não é permitida."


async def ensure_competition_not_finished(session: AsyncSession, competition_id: UUID) -> None:
    row = await session.get(CompetitionModel, competition_id)
    if row is None:
        return
    if row.status == CompetitionStatus.FINISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=FINISHED_COMPETITION_MSG,
        )
