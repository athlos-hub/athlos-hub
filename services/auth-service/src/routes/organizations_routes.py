from fastapi import APIRouter, status, Depends, Query
from typing import Optional, List
import logging
from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from ..schemas.organization import OrganizationResponse, OrganizationCreate, OrganizationGetPublic, OrganizationWithRole
from ..models.enums import OrganizationPrivacy
from ..core.exceptions import OrganizationAlreadyExists
from ..models.user import User
from ..models.organization import Organization, OrganizationMember, OrganizationOrganizer
from ..services.auth_service import AuthService
from ..models.enums import MemberStatus
from ..dependencies.organization import OrgRole
from database.dependencies import get_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: User = Depends(AuthService.get_current_db_user),
    session: AsyncSession = Depends(get_session)
):

    generated_slug = slugify(org_data.name)

    new_org = Organization(
        name=org_data.name,
        slug=generated_slug,
        description=org_data.description,
        logo_url=org_data.logo_url,
        privacy=org_data.privacy,
        owner_id=current_user.id
    )

    session.add(new_org)

    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise OrganizationAlreadyExists(org_data.name)

    owner_member = OrganizationMember(
        organization_id=new_org.id,
        user_id=current_user.id,
        status=MemberStatus.ACTIVE
    )
    session.add(owner_member)

    await session.commit()
    await session.refresh(new_org)

    return new_org


@router.get("", response_model=List[OrganizationGetPublic])
async def get_organizations(
        session: AsyncSession = Depends(get_session),
        privacy: Optional[OrganizationPrivacy] = Query(None),
        limit: int = Query(50, ge=1, le=200),
        offset: int = Query(0, ge=0),
):

    query = select(Organization)

    if privacy:
        query = query.where(Organization.privacy == privacy)

    query = query.order_by(Organization.name.asc())

    query = query.limit(limit).offset(offset)

    result = await session.execute(query)
    return result.scalars().all()


@router.get("/me", response_model=List[OrganizationWithRole])
async def get_my_organizations(
    user: User = Depends(AuthService.get_current_db_user),
    session: AsyncSession = Depends(get_session)
):

    query_owner = select(Organization).where(Organization.owner_id == user.id)
    owners = (await session.execute(query_owner)).scalars().all()

    query_organizer = select(Organization).join(OrganizationOrganizer).where(
        OrganizationOrganizer.user_id == user.id
    )
    organizers = (await session.execute(query_organizer)).scalars().all()

    query_member = select(Organization).join(OrganizationMember).where(
        OrganizationMember.user_id == user.id,
        OrganizationMember.status == MemberStatus.ACTIVE
    )
    members = (await session.execute(query_member)).scalars().all()

    result = []
    for org in owners:
        result.append({**org.__dict__, "role": OrgRole.OWNER})
    for org in organizers:
        if org.id not in [o.id for o in owners]:
            result.append({**org.__dict__, "role": OrgRole.ORGANIZER})
    for org in members:
        if org.id not in [o["id"] for o in result]:
            result.append({**org.__dict__, "role": OrgRole.MEMBER})

    return result