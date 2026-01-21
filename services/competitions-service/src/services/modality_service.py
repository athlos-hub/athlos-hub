from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from src.models.modality import ModalityModel
from src.schemas.modality_schema import ModalityCreateSchema

class ModalityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_modality(self, data: ModalityCreateSchema) -> ModalityModel:
        new_modality = ModalityModel(**data.model_dump())

        self.db.add(new_modality)
        await self.db.flush()

        return new_modality
    
    async def get_all_modalities(self, offset: int = 0, limit: int = 10) -> List[ModalityModel]:
        query = select(ModalityModel).offset(offset).limit(limit)
        result = await self.db.execute(query)
        
        return result.scalars().all()