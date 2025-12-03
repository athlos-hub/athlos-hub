from fastapi import APIRouter, status, Depends, Query, HTTPException
from typing import Optional, List
import logging
from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, case, and_, or_, literal
from ..schemas.organization import OrganizationResponse, OrganizationCreate, OrganizationGetPublic, OrganizationWithRole, OrganizationAdminWithRole, OrganizationUpdate
from ..models.enums import OrganizationPrivacy
from ..core.exceptions import OrganizationAlreadyExists, OrganizationNotFoundError
from ..models.user import User
from ..models.organization import Organization, OrganizationMember, OrganizationOrganizer
from ..services.auth_service import AuthService
from ..models.enums import MemberStatus, OrganizationStatus
from ..dependencies.organization import OrgRole, get_user_org_role
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
        logger.warning(f"Tentativa de criar organização duplicada: {org_data.name} por usuário {current_user.id}")
        raise OrganizationAlreadyExists(org_data.name)

    owner_member = OrganizationMember(
        organization_id=new_org.id,
        user_id=current_user.id,
        status=MemberStatus.ACTIVE
    )
    session.add(owner_member)

    await session.commit()
    await session.refresh(new_org)

    logger.info(f"Organização criada: {new_org.slug} (ID: {new_org.id}) por usuário {current_user.id}")
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


@router.get("/me", response_model=List[OrganizationWithRole | OrganizationAdminWithRole])
async def get_my_organizations(user: User = Depends(AuthService.get_current_db_user),
                               session: AsyncSession = Depends(get_session),
                               roles: Optional[List[str]] = Query(None)):

    if roles is None:
        search_roles = {OrgRole.OWNER, OrgRole.ORGANIZER, OrgRole.MEMBER}
    else:
        search_roles = set(roles)

    is_owner = (Organization.owner_id == user.id)
    is_organizer = (OrganizationOrganizer.id.is_not(None))
    is_member = (OrganizationMember.id.is_not(None))

    role_case = case(
        (is_owner, literal(OrgRole.OWNER)),
        (is_organizer, literal(OrgRole.ORGANIZER)),
        (is_member, literal(OrgRole.MEMBER)),
        else_=literal(OrgRole.NONE)
    ).label("role")

    query = (
        select(Organization, role_case)
        .outerjoin(
            OrganizationOrganizer,
            and_(
                OrganizationOrganizer.organization_id == Organization.id,
                OrganizationOrganizer.user_id == user.id
            )
        )
        .outerjoin(
            OrganizationMember,
            and_(
                OrganizationMember.organization_id == Organization.id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.status == MemberStatus.ACTIVE
            )
        )
    )

    filters = []
    if OrgRole.OWNER in search_roles:
        filters.append(is_owner)
    if OrgRole.ORGANIZER in search_roles:
        filters.append(is_organizer)
    if OrgRole.MEMBER in search_roles:
        filters.append(is_member)

    if not filters:
        return []

    query = query.where(or_(*filters))
    query = query.order_by(Organization.created_at.desc())

    results = (await session.execute(query)).all()

    response_list = []
    for org, role_name in results:
        setattr(org, "role", role_name)

        if role_name == OrgRole.OWNER:
            dto = OrganizationAdminWithRole.model_validate(org)
        else:
            dto = OrganizationWithRole.model_validate(org)
        response_list.append(dto)

    return response_list


@router.get("/{org_slug}", response_model=OrganizationResponse | OrganizationGetPublic)
async def get_organization_by_id(org_slug: str,
                                 session: AsyncSession = Depends(get_session),
                                 user: User = Depends(AuthService.get_current_user_optional)):

    stmt = select(Organization).where(Organization.slug == org_slug)
    result = await session.execute(stmt)
    org = result.scalars().first()

    if not org:
        raise OrganizationNotFoundError(org_slug)

    if user:
        org_role = await get_user_org_role(org.id, user, session)

        if org_role == OrgRole.OWNER:
            return org

        if org_role == OrgRole.NONE and org.privacy == OrganizationPrivacy.PRIVATE:
            logger.warning(f"Acesso negado à organização privada {org_slug} para usuário {user.id}")
            raise HTTPException(status_code=403, detail="Acesso negado à organização privada.")

        if org_role in {OrgRole.ORGANIZER, OrgRole.MEMBER} or org_role == OrgRole.NONE and org.privacy == OrganizationPrivacy.PUBLIC:
            return OrganizationGetPublic.model_validate(org)

        raise HTTPException(status_code=403, detail="Você não tem a função necessária para visualizar esta organização.")
    else:
        if org.privacy == OrganizationPrivacy.PRIVATE:
            raise HTTPException(status_code=403, detail="Acesso negado à organização privada.")

        return OrganizationGetPublic.model_validate(org)


@router.patch("/{org_slug}", response_model=OrganizationResponse)
async def update_organization(org_slug: str,
                              org_data: OrganizationUpdate,
                              user: User = Depends(AuthService.get_current_db_user),
                              session: AsyncSession = Depends(get_session)):

    stmt = select(Organization).where(Organization.slug == org_slug)
    result = await session.execute(stmt)
    org = result.scalars().first()

    if not org:
        raise OrganizationNotFoundError(org_slug)

    if org.owner_id != user.id:
        logger.warning(f"Tentativa de atualização não autorizada da organização {org_slug} por usuário {user.id}")
        raise HTTPException(status_code=403, detail="Apenas o proprietário da organização pode atualizá-la.")

    update_data = org_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(org, key, value)

    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        logger.warning(f"Conflito ao atualizar organização {org_slug}: dados duplicados")
        raise OrganizationAlreadyExists(org_data.name)

    await session.commit()
    await session.refresh(org)

    logger.info(f"Organização atualizada: {org_slug} por usuário {user.id}")
    return org


@router.delete("/{org_slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(org_slug: str,
                              user: User = Depends(AuthService.get_current_db_user),
                              session: AsyncSession = Depends(get_session)):

    stmt = select(Organization).where(Organization.slug == org_slug)
    result = await session.execute(stmt)
    org = result.scalars().first()

    if not org:
        raise OrganizationNotFoundError(org_slug)

    is_owner = org.owner_id == user.id

    if not is_owner:
        logger.warning(f"Tentativa de exclusão não autorizada da organização {org_slug} por usuário {user.id}")
        raise HTTPException(
            status_code=403,
            detail="Apenas o proprietário pode excluir esta organização."
        )

    if org.status in {
        OrganizationStatus.EXCLUDED,
        OrganizationStatus.REJECTED,
        OrganizationStatus.SUSPENDED
    }:
        raise HTTPException(
            status_code=409,
            detail="Organização já está inativa."
        )

    if is_owner:
        if org.status in {OrganizationStatus.PENDING, OrganizationStatus.ACTIVE}:
            org.status = OrganizationStatus.EXCLUDED
            logger.info(f"Organização {org_slug} excluída pelo proprietário {user.id}")
        else:
            raise HTTPException(
                status_code=403,
                detail="Não é permitido excluir a organização neste estado."
            )

    await session.commit()

    return