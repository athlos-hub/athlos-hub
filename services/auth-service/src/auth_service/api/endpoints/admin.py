"""Endpoints do administrador"""

import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from auth_service.api.deps import CurrentUserDep, OrganizationServiceDep, UserServiceDep
from auth_service.core.security import require_role
from auth_service.schemas.organization import OrganizationResponse
from auth_service.schemas.user import UserAdmin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/users",
    dependencies=[Depends(require_role(["admin"]))],
    response_model=List[UserAdmin],
)
async def get_users_admin(user_service: UserServiceDep):
    """Obtém todos os usuários (apenas admin)."""

    return await user_service.get_all_users()


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["admin"]))],
)
async def suspend_user_by_admin(
    user_service: UserServiceDep,
    user_id: UUID,
):
    """Suspende um usuário (apenas admin)."""

    await user_service.suspend_user(user_id)
    logger.info(f"Usuário {user_id} suspenso por admin")
    return


@router.delete(
    "/organizations/delete/{org_slug}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["admin"]))],
)
async def delete_organization(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Exclui/rejeita organização (apenas admin)."""

    await org_service.admin_delete_organization(org_slug)
    logger.info(f"Organização {org_slug} excluída/rejeitada por admin {user.id}")
    return


@router.patch(
    "/organizations/accept/{org_slug}",
    dependencies=[Depends(require_role(["admin"]))],
    response_model=OrganizationResponse,
)
async def accept_organization(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Aceita organização pendente (apenas admin)."""

    org = await org_service.admin_accept_organization(org_slug)
    logger.info(f"Organização {org_slug} aceita por admin {user.id}")
    return org


@router.delete(
    "/organizations/suspend/{org_slug}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["admin"]))],
)
async def suspend_organization(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Suspende organização (apenas admin)."""

    await org_service.admin_suspend_organization(org_slug)
    logger.info(f"Organização {org_slug} suspensa por admin {user.id}")
    return
