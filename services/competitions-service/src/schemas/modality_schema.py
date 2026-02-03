from pydantic import BaseModel, Field, ConfigDict

class ModalityBaseSchema(BaseModel):
    name: str = Field(..., description="Nome da modalidade", max_length=100)
    organization_slug: str = Field(..., description="Slug da organização", max_length=255)

class ModalityCreateSchema(ModalityBaseSchema):
    pass

class ModalityResponseSchema(ModalityBaseSchema):
    id: int = Field(..., description="ID da modalidade")

    model_config = ConfigDict(from_attributes=True)