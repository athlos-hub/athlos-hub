from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from .routes import get_session
from src.models.teams import TeamModel
from src.schemas.teams_schema import TeamCreateSchema, TeamResponseSchema
from src.services.teams_service import TeamService

router = APIRouter(prefix="/teams", tags=["teams"])

@router.post("/", response_model=TeamResponseSchema)
async def create_team(team_data: TeamCreateSchema, session: AsyncSession = Depends(get_session)):
    team_service = TeamService(session)
    team = await team_service.create_team(team_data)

    return team
