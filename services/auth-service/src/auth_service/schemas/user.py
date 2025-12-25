from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from auth_service.infrastructure.database.models.enums import MemberStatus


class UserPublic(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserOrgMember(UserPublic):
    email: EmailStr


class UserAdmin(UserOrgMember):
    enabled: bool = True
    email_verified: bool = False
    keycloak_id: str
    created_at: datetime
    updated_at: datetime


class MemberRequestUser(BaseModel):
    id: UUID
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PendingMemberRequest(BaseModel):
    id: UUID
    user: MemberRequestUser
    status: MemberStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PendingRequestsResponse(BaseModel):
    total: int
    requests: list[PendingMemberRequest]
    total: int
    requests: list[PendingMemberRequest]
