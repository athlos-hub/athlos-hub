from pydantic import BaseModel, Field, ConfigDict
import uuid

class ModalityBaseSchema(BaseModel):
    name: str = Field(..., description="Nome da modalidade", max_length=100)
    organization_slug: str = Field(..., description="Slug da organização", max_length=255)

class ModalityCreateSchema(ModalityBaseSchema):
    pass


class ModalityUpdateSchema(BaseModel):
    name: str = Field(..., description="Nome da modalidade", max_length=100)

class ModalityResponseSchema(ModalityBaseSchema):
    id: uuid.UUID = Field(..., description="ID da modalidade")

    model_config = ConfigDict(from_attributes=True)