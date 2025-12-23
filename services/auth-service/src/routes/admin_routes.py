from fastapi import APIRouter, status, Depends, HTTPException
from typing import Set, List
import logging
from starlette.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.exceptions import OrganizationNotFoundError
from ..core.security import require_role
from ..models.user import User
from ..models.organization import Organization
from ..services.auth_service import AuthService
from ..models.enums import OrganizationStatus
from ..schemas.organization import OrganizationResponse
from database.dependencies import get_session
from ..schemas.user import UserAdmin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/users", dependencies=[Depends(require_role(["admin"]))], response_model=List[UserAdmin])
async def get_users_admin(session: AsyncSession = Depends(get_session)):
    users = await session.execute(select(User))
    return users.scalars().all()


@router.delete("/organizations/delete/{org_slug}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_role(["admin"]))])
async def delete_organization(org_slug: str,
                              user: User = Depends(AuthService.get_current_db_user),
                              session: AsyncSession = Depends(get_session)):

    stmt = select(Organization).where(Organization.slug == org_slug)
    result = await session.execute(stmt)
    org = result.scalars().first()

    if not org:
        raise OrganizationNotFoundError(org_slug)

    user_roles: Set[str] = set(await run_in_threadpool(
        AuthService.get_role_from_user,
        user.keycloak_id
    ))

    is_admin = "admin" in user_roles

    if not is_admin:
        logger.warning(f"Tentativa de exclusão não autorizada da organização {org_slug} por usuário {user.id}")
        raise HTTPException(
            status_code=403,
            detail="Apenas o administrador pode excluir esta organização."
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

    if is_admin:
        if org.status == OrganizationStatus.PENDING:
            org.status = OrganizationStatus.REJECTED
            logger.info(f"Organização {org_slug} rejeitada por admin {user.id}")
        else:
            org.status = OrganizationStatus.EXCLUDED
            logger.info(f"Organização {org_slug} excluída por admin {user.id}")

    await session.commit()

    return


@router.patch("/organizations/accept/{org_slug}", dependencies=[Depends(require_role(["admin"]))], response_model=OrganizationResponse)
async def accept_organization(org_slug: str,
                              user: User = Depends(AuthService.get_current_db_user),
                              session: AsyncSession = Depends(get_session)):

    stmt = select(Organization).where(Organization.slug == org_slug)
    result = await session.execute(stmt)
    org = result.scalars().first()

    if not org:
        raise OrganizationNotFoundError(org_slug)

    if org.status != OrganizationStatus.PENDING:
        raise HTTPException(
            status_code=409,
            detail="Apenas organizações pendentes podem ser aceitas."
        )

    org.status = OrganizationStatus.ACTIVE
    await session.commit()

    logger.info(f"Organização {org_slug} aceita por admin {user.id}")

    return org


@router.delete("/organizations/suspend/{org_slug}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_role(["admin"]))])
async def suspend_organization(org_slug: str,
                           user: User = Depends(AuthService.get_current_db_user),
                           session: AsyncSession = Depends(get_session)):

    stmt = select(Organization).where(Organization.slug == org_slug)
    result = await session.execute(stmt)
    org = result.scalars().first()

    if not org:
        raise OrganizationNotFoundError(org_slug)

    if org.status == OrganizationStatus.SUSPENDED:
        raise HTTPException(
            status_code=409,
            detail="Organização já está suspensa."
        )

    org.status = OrganizationStatus.SUSPENDED
    await session.commit()

    logger.info(f"Organização {org_slug} suspensa por admin {user.id}")

    return