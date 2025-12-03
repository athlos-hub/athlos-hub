from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from typing import Optional
from datetime import datetime
from ..models.enums import OrganizationPrivacy, OrganizationStatus

class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    logo_url: Optional[str] = None
    privacy: OrganizationPrivacy = OrganizationPrivacy.PUBLIC

    model_config = ConfigDict(from_attributes=True)

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    privacy: Optional[str] = None

    model_config = ConfigDict(extra='ignore')

class OrganizationGetPublic(OrganizationBase):
    id: UUID
    slug: str
    owner_id: UUID

class OrganizationResponse(OrganizationGetPublic):
    status: OrganizationStatus
    created_at: datetime
    updated_at: datetime

class OrganizationWithRole(OrganizationGetPublic):
    role: str

    model_config = ConfigDict(from_attributes=True)

class OrganizationAdminWithRole(OrganizationResponse):
    role: str

    model_config = ConfigDict(from_attributes=True)