from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import logging

from src.models.modality import ModalityModel
from src.schemas.modality_schema import ModalityCreateSchema
from src.services.auth_client import (
    AuthClient,
    AuthClientError,
    AuthServiceUnavailable,
)
from src.config.settings import settings

logger = logging.getLogger(__name__)


class ModalityService:
    def __init__(self, db: AsyncSession, auth_client: Optional[AuthClient] = None):
        self.db = db
        self._auth_client = auth_client

    async def _get_auth_client(self) -> AuthClient:
        """Retorna o cliente de auth configurado."""
        if self._auth_client:
            return self._auth_client
        return AuthClient(
            base_url=settings.AUTH_SERVICE_URL,
            timeout=settings.AUTH_SERVICE_TIMEOUT
        )

    async def _validate_organization_exists(self, organization_slug: str) -> None:
        """
        Valida se a organização existe no Auth Service.
        
        Args:
            organization_slug: Slug da organização
            
        Raises:
            HTTPException: Se a organização não existir ou serviço indisponível
        """
        auth_client = await self._get_auth_client()
        
        try:
            async with auth_client:
                result = await auth_client.check_organization_exists(organization_slug)
                
                if not result.get("exists"):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Organização '{organization_slug}' não encontrada"
                    )
                    
            logger.info(f"Organização '{organization_slug}' validada com sucesso")
            
        except AuthServiceUnavailable as e:
            logger.error(f"Serviço de autenticação indisponível: {e}")
            raise HTTPException(
                status_code=503,
                detail="Serviço de autenticação temporariamente indisponível. Tente novamente mais tarde."
            ) from e
        except AuthClientError as e:
            logger.error(f"Erro ao validar organização: {e}")
            raise HTTPException(
                status_code=500,
                detail="Erro ao validar organização. Tente novamente mais tarde."
            ) from e

    async def create_modality(self, data: ModalityCreateSchema) -> ModalityModel:
        # Validar se a organização existe
        await self._validate_organization_exists(data.organization_slug)
        
        new_modality = ModalityModel(**data.model_dump())

        self.db.add(new_modality)
        await self.db.flush()

        return new_modality
    
    async def get_all_modalities(self, offset: int = 0, limit: int = 10) -> List[ModalityModel]:
        query = select(ModalityModel).offset(offset).limit(limit)
        result = await self.db.execute(query)
        
        return result.scalars().all()