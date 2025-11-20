from fastapi import APIRouter, status, Depends
import logging
from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from ..schemas.organization import OrganizationPublic, OrganizationCreate
from ..core.exceptions import OrganizationAlreadyExists
from ..models.user import User
from ..models.organization import Organization, OrganizationMember
from ..services.auth_service import AuthService
from ..models.enums import MemberStatus
from database.dependencies import get_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post("", response_model=OrganizationPublic, status_code=status.HTTP_201_CREATED)
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