from fastapi import APIRouter, status, Depends, HTTPException
from uuid import UUID
from sqlalchemy import select
from ..models.user import User
from ..schemas.user import UserPublic
from ..core.exceptions import OrganizationNotFoundError
from database.dependencies import get_session
from ..core.exceptions import UserNotFoundError
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from slugify import slugify
from ..models.organization import Organization, OrganizationMember, OrganizationOrganizer
from ..services.auth_service import AuthService
from ..models.enums import MemberStatus
from database.dependencies import get_session


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/{user_id}", response_model=UserPublic)
async def get_user_by_id(user_id: UUID,
                         session: AsyncSession = Depends(get_session)):

    user = await session.get(User, user_id)

    if not user or not user.enabled:
        raise UserNotFoundError(str(user_id))

    return user


@router.post("/organizations/{org_slug}/accept-invite", status_code=status.HTTP_200_OK)
async def accept_organization_invite(org_slug: str,
                                     user: User = Depends(AuthService.get_current_db_user),
                                     session: AsyncSession = Depends(get_session)):

    stmt = (
        select(OrganizationMember)
        .join(
            Organization,
            OrganizationMember.organization_id == Organization.id
        )
        .where(
            Organization.slug == org_slug,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MemberStatus.INVITED
        )
    )

    membership = await session.scalar(stmt)

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Você não tem um convite pendente para esta organização."
        )

    membership.status = MemberStatus.ACTIVE
    await session.commit()

    logger.info(f"Usuário {user.id} aceitou convite para a organização {org_slug}")
    return {
        "message": "Convite aceito com sucesso."
    }


@router.post("/organizations/{org_slug}/decline-invite", status_code=status.HTTP_200_OK)
async def decline_organization_invite(org_slug: str,
                                      user: User = Depends(AuthService.get_current_db_user),
                                      session: AsyncSession = Depends(get_session)):

    stmt = (
        select(OrganizationMember)
        .join(
            Organization,
            OrganizationMember.organization_id == Organization.id
        )
        .where(
            Organization.slug == org_slug,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MemberStatus.INVITED
        )
    )

    membership = await session.scalar(stmt)

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Você não tem um convite pendente para esta organização."
        )

    await session.delete(membership)
    await session.commit()

    logger.info(f"Usuário {user.id} recusou convite para a organização {org_slug}")
    return {
        "message": "Convite recusado."
    }


@router.delete("/organizations/{org_slug}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_organization(org_slug: str,
                             user: User = Depends(AuthService.get_current_db_user),
                             session: AsyncSession = Depends(get_session)):

    org_stmt = select(Organization).where(Organization.slug == org_slug)

    org = await session.scalar(org_stmt)

    if not org:
        raise OrganizationNotFoundError(org_slug)

    if org.owner_id == user.id:
        raise HTTPException(
            status_code=403,
            detail="O proprietário da organização não pode sair da organização. "
                   "Transfira a propriedade ou exclua a organização."
        )

    organizer_stmt = (
        select(OrganizationOrganizer)
        .where(
            OrganizationOrganizer.organization_id == org.id,
            OrganizationOrganizer.user_id == user.id
        )
    )

    organizer = await session.scalar(organizer_stmt)

    if organizer:
        await session.delete(organizer)

    membership_stmt = (
        select(OrganizationMember)
        .where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MemberStatus.ACTIVE,
        )
    )

    membership = await session.scalar(membership_stmt)

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Você não é um membro ativo desta organização."
        )

    await session.delete(membership)
    await session.commit()

    logger.info(f"Usuário {user.id} saiu da organização {org_slug}")
    return