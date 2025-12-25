"""Endpoints de usuário"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, File, Form, UploadFile, status

from auth_service.api.deps import CurrentUserDep, OrganizationServiceDep, UserServiceDep
from auth_service.schemas.user import UserPublic

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserPublic])
async def get_users_public(user_service: UserServiceDep):
    """Obtém todos os usuários públicos (ativos)."""

    return await user_service.get_all_enabled_users()


@router.get("/me", response_model=UserPublic)
async def get_authenticated_user_info(
    db_user: CurrentUserDep,
):
    """Obtém informações do usuário autenticado atual."""

    return db_user


@router.put("/me", response_model=UserPublic)
async def update_user_info(
    user_service: UserServiceDep,
    user: CurrentUserDep,
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    username: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
):
    """Atualiza informações do usuário atual."""

    updated_user = await user_service.update_user_profile(
        user=user,
        first_name=first_name,
        last_name=last_name,
        username=username,
        avatar=avatar,
    )

    logger.info(f"Usuário {user.id} atualizou seu perfil")
    return updated_user


@router.get("/{user_id}", response_model=UserPublic)
async def get_user_by_id(user_id: UUID, user_service: UserServiceDep):
    """Obtém um usuário específico por ID."""

    return await user_service.get_user_by_id(user_id)


@router.post("/organizations/{org_slug}/accept-invite", status_code=status.HTTP_200_OK)
async def accept_organization_invite(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Aceita um convite de organização."""

    await org_service.accept_invite(org_slug, user)
    logger.info(f"Usuário {user.id} aceitou convite para a organização {org_slug}")
    return {"message": "Convite aceito com sucesso."}


@router.post("/organizations/{org_slug}/decline-invite", status_code=status.HTTP_200_OK)
async def decline_organization_invite(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Recusa um convite de organização."""

    await org_service.decline_invite(org_slug, user)
    logger.info(f"Usuário {user.id} recusou convite para a organização {org_slug}")
    return {"message": "Convite recusado."}


@router.delete(
    "/organizations/{org_slug}/leave", status_code=status.HTTP_204_NO_CONTENT
)
async def leave_organization(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Sai de uma organização."""

    await org_service.leave_organization(org_slug, user)
    logger.info(f"Usuário {user.id} saiu da organização {org_slug}")
    return
