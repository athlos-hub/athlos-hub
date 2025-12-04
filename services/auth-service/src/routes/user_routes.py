from fastapi import APIRouter, status, Depends, HTTPException
from uuid import UUID
from sqlalchemy import select
from ..models.user import User
from ..schemas.user import UserPublic, UserAdmin
from database.dependencies import get_session
from ..core.exceptions import UserNotFoundError
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from slugify import slugify
from ..models.organization import Organization, OrganizationMember
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
