from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth_service.infrastructure.database.models.enums import MemberStatus
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationMember,
    OrganizationOrganizer,
)
from auth_service.infrastructure.database.models.user_model import User


class OrgRole:
    OWNER = "OWNER"
    ORGANIZER = "ORGANIZER"
    MEMBER = "MEMBER"
    NONE = "NONE"


async def get_user_org_role(org_id: UUID, user: User, session: AsyncSession) -> str:
    org = await session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organização não encontrada.")

    if org.owner_id == user.id:
        return OrgRole.OWNER

    organizer_entry = await session.execute(
        select(OrganizationOrganizer).where(
            OrganizationOrganizer.organization_id == org_id,
            OrganizationOrganizer.user_id == user.id,
        )
    )
    if organizer_entry.scalar_one_or_none():
        return OrgRole.ORGANIZER

    member_entry = await session.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MemberStatus.ACTIVE,
        )
    )
    if member_entry.scalar_one_or_none():
        return OrgRole.MEMBER

    return OrgRole.NONE
