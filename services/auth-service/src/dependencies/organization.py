from fastapi import Depends, HTTPException, Path
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database.dependencies import get_session
from ..services.auth_service import AuthService
from ..models.user import User
from ..models.organization import Organization, OrganizationOrganizer, OrganizationMember
from ..models.enums import MemberStatus


class OrgRole:
    OWNER = "OWNER"
    ORGANIZER = "ORGANIZER"
    MEMBER = "MEMBER"
    NONE = "NONE"


async def get_user_org_role(
        org_id: UUID,
        user: User,
        session: AsyncSession
) -> str:

    org = await session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organização não encontrada.")

    if org.owner_id == user.id:
        return OrgRole.OWNER

    organizer_entry = await session.execute(
        select(OrganizationOrganizer).where(
            OrganizationOrganizer.organization_id == org_id,
            OrganizationOrganizer.user_id == user.id
        )
    )
    if organizer_entry.scalar_one_or_none():
        return OrgRole.ORGANIZER

    member_entry = await session.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MemberStatus.ACTIVE
        )
    )
    if member_entry.scalar_one_or_none():
        return OrgRole.MEMBER

    return OrgRole.NONE