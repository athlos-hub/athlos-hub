from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import logging
from uuid import UUID

from src.models.modality import ModalityModel
from src.schemas.modality_schema import ModalityCreateSchema, ModalityUpdateSchema
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
        if self._auth_client:
            return self._auth_client
        return AuthClient(
            base_url=settings.AUTH_SERVICE_URL,
            timeout=settings.AUTH_SERVICE_TIMEOUT
        )

    async def _validate_organization_exists(self, organization_slug: str) -> None:
        auth_client = await self._get_auth_client()
        try:
            async with auth_client:
                result = await auth_client.check_organization_exists(organization_slug)
                if not result.get('exists'):
                    raise HTTPException(
                        status_code=404,
                        detail=f'Organizacao {organization_slug} nao encontrada'
                    )
            logger.info(f'Organizacao {organization_slug} validada com sucesso')
        except AuthServiceUnavailable as e:
            logger.error(f'Servico de autenticacao indisponivel: {e}')
            raise HTTPException(
                status_code=503,
                detail='Servico de autenticacao temporariamente indisponivel.'
            ) from e
        except AuthClientError as e:
            logger.error(f'Erro ao validar organizacao: {e}')
            raise HTTPException(
                status_code=500,
                detail='Erro ao validar organizacao. Tente novamente mais tarde.'
            ) from e

    async def create_modality(self, data: ModalityCreateSchema) -> ModalityModel:
        await self._validate_organization_exists(data.organization_slug)
        new_modality = ModalityModel(**data.model_dump())
        self.db.add(new_modality)
        await self.db.flush()
        return new_modality

    async def get_all_modalities(
        self,
        offset: int = 0,
        limit: int = 10,
        organization_slug: Optional[str] = None
    ) -> List[ModalityModel]:
        query = select(ModalityModel)
        if organization_slug:
            query = query.where(ModalityModel.organization_slug == organization_slug)
        query = query.offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, modality_id: UUID) -> ModalityModel:
        query = select(ModalityModel).where(ModalityModel.id == modality_id)
        result = await self.db.execute(query)
        modality = result.scalar_one_or_none()
        if not modality:
            raise HTTPException(status_code=404, detail="Modalidade não encontrada")
        return modality

    async def update_modality(self, modality_id: UUID, data: ModalityUpdateSchema) -> ModalityModel:
        modality = await self.get_by_id(modality_id)
        modality.name = data.name
        await self.db.commit()
        await self.db.refresh(modality)
        return modality

    async def delete_modality(self, modality_id: UUID) -> None:
        modality = await self.get_by_id(modality_id)
        try:
            await self.db.delete(modality)
            await self.db.commit()
        except Exception as exc:
            await self.db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Não foi possível excluir a modalidade porque ela possui vínculos ativos.",
            ) from exc

