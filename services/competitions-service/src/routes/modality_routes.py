from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.schemas.modality_schema import ModalityCreateSchema, ModalityResponseSchema
from src.services.modality_service import ModalityService

from src.routes.routes import get_session

router = APIRouter(prefix="/modalities", tags=["modalities"])

@router.post("/", response_model=ModalityResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_modality(
    modality_data: ModalityCreateSchema,
    session: AsyncSession = Depends(get_session)
):
    modality_service = ModalityService(session)
    new_modality = await modality_service.create_modality(modality_data)
    
    return new_modality

@router.get("/", response_model=List[ModalityResponseSchema])
async def get_modalities(
    offset: int = 0,
    limit: int = 10,
    session: AsyncSession = Depends(get_session)
):
    modality_service = ModalityService(session)
    modalities = await modality_service.get_all_modalities(offset=offset, limit=limit)
    
    return modalities