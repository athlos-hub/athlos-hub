from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from typing import Optional
from datetime import datetime
from ..models.enums import OrganizationPrivacy, OrganizationStatus, OrganizationJoinPolicy
from ..schemas.user import UserOrgMember
from ..models.enums import MemberStatus

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
    privacy: Optional[OrganizationPrivacy] = None
    join_policy: Optional[OrganizationJoinPolicy] = None

    model_config = ConfigDict(extra='ignore')

class OrganizationGetPublic(OrganizationBase):
    id: UUID
    slug: str
    owner_id: UUID

class OrganizationResponse(OrganizationGetPublic):
    status: OrganizationStatus
    join_policy: Optional[OrganizationJoinPolicy] = None
    created_at: datetime
    updated_at: datetime

class OrganizationWithRole(OrganizationGetPublic):
    role: str

    model_config = ConfigDict(from_attributes=True)

class OrganizationAdminWithRole(OrganizationResponse):
    role: str

    model_config = ConfigDict(from_attributes=True)


class UpdateJoinPolicyRequest(BaseModel):
    join_policy: OrganizationJoinPolicy


class OrganizationMemberResponse(BaseModel):
    id: UUID
    user: UserOrgMember
    status: MemberStatus
    joined_at: datetime
    is_owner: bool = False

    model_config = ConfigDict(from_attributes=True)


class MembersListResponse(BaseModel):
    total: int
    members: list[OrganizationMemberResponse]


class OrganizerResponse(BaseModel):
    id: UUID
    user: UserOrgMember
    added_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizersListResponse(BaseModel):
    total: int
    organizers: list[OrganizerResponse]


class TeamOverviewResponse(BaseModel):
    owner: UserOrgMember
    organizers: list[OrganizerResponse]
    members: list[OrganizationMemberResponse]
    total_members: int
    total_organizers: int


class TransferOwnershipRequest(BaseModel):
    new_owner_id: UUID