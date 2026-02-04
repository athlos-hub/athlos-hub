from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from src.schemas.modality_schema import ModalityCreateSchema, ModalityResponseSchema
from src.services.modality_service import ModalityService
from src.routes.routes import get_session
from src.api.deps import get_current_keycloak_id, RequireOrgPermission

router = APIRouter(prefix="/modalities", tags=["modalities"])

# Dependência para verificar permissão de OWNER ou ORGANIZER
require_org_permission = RequireOrgPermission(["OWNER", "ORGANIZER"])


@router.post("/", response_model=ModalityResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_modality(
    modality_data: ModalityCreateSchema,
    session: AsyncSession = Depends(get_session),
    current_keycloak_id: UUID = Depends(get_current_keycloak_id),
):
    """
    Cria uma nova modalidade.
    
    Requer autenticação e permissão de OWNER ou ORGANIZER na organização.
    """
    # Verificar permissão na organização
    await require_org_permission(
        organization_slug=modality_data.organization_slug,
        keycloak_id=current_keycloak_id
    )
    
    modality_service = ModalityService(session)
    new_modality = await modality_service.create_modality(modality_data)
    
    return new_modality


@router.get("/", response_model=List[ModalityResponseSchema])
async def get_modalities(
    offset: int = 0,
    limit: int = 10,
    organization_slug: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    Lista modalidades (público).
    
    Se organization_slug for fornecido, retorna apenas as modalidades da organização.
    Caso contrário, retorna todas as modalidades.
    """
    modality_service = ModalityService(session)
    modalities = await modality_service.get_all_modalities(
        offset=offset, 
        limit=limit,
        organization_slug=organization_slug
    )
    
    return modalities