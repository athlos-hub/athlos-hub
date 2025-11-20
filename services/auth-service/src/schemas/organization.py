from pydantic import BaseModel, ConfigDict, HttpUrl, Field
from uuid import UUID
from typing import Optional
from datetime import datetime
from ..models.enums import OrganizationPrivacy, OrganizationStatus


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    logo_url: Optional[str] = None
    privacy: OrganizationPrivacy = OrganizationPrivacy.PUBLIC


class OrganizationPublic(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    privacy: OrganizationPrivacy
    status: OrganizationStatus
    owner_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)