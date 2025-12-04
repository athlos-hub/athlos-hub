from pydantic import BaseModel, ConfigDict, EmailStr
from ..models.enums import MemberStatus
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserPublic(BaseModel):
    id: UUID
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserOrgMember(UserPublic):
    email: EmailStr


class UserAdmin(UserOrgMember):
    keycloak_id: str
    enabled: bool
    email_verified: bool
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