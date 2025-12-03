from fastapi import APIRouter, status, Depends, HTTPException
from typing import Set
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
from database.dependencies import get_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.delete("/organizations/{org_slug}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_role(["admin"]))])
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