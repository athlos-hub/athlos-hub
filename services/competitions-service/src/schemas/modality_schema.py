from pydantic import BaseModel, Field, ConfigDict

class ModalityBaseSchema(BaseModel):
    name: str = Field(..., description="Nome da modalidade", max_length=100)
    org_code: str = Field(..., description="Código da organização", max_length=50)

class ModalityCreateSchema(ModalityBaseSchema):
    pass

class ModalityResponseSchema(ModalityBaseSchema):
    id: int = Field(..., description="ID da modalidade")

    model_config = ConfigDict(from_attributes=True)