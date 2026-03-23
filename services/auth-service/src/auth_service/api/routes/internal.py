"""Endpoints internos para comunicação service-to-service."""

import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, status

from auth_service.api.deps import OrganizationServiceDep
from auth_service.schemas.internal import (
    ValidateMembersRequest,
    ValidateMembersResponse,
    UserValidationResult,
    CheckPermissionRequest,
    CheckPermissionResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal"])


@router.post(
    "/validate-members",
    response_model=ValidateMembersResponse,
    status_code=status.HTTP_200_OK,
)
async def validate_organization_members(
    request: ValidateMembersRequest,
    org_service: OrganizationServiceDep,
):
    """
    Valida se os usuários existem e pertencem à organização especificada.
    
    Este endpoint é destinado para comunicação service-to-service,
    usado pelo competitions-service para validar membros ao criar times.
    
    Returns:
        ValidateMembersResponse: Resultado da validação com detalhes por usuário.
    """
    result = await org_service.validate_members_for_organization(
        organization_slug=request.organization_slug,
        keycloak_ids=request.keycloak_ids,
    )
    
    logger.info(
        f"Validação de membros para org {request.organization_slug}: "
        f"{result.valid_count}/{len(request.keycloak_ids)} válidos"
    )
    
    return result


@router.get(
    "/organizations/{org_slug}/exists",
    status_code=status.HTTP_200_OK,
)
async def check_organization_exists(
    org_slug: str,
    org_service: OrganizationServiceDep,
):
    """
    Verifica se uma organização existe pelo slug.
    
    Returns:
        dict: {"exists": bool, "organization_id": UUID | None}
    """
    org = await org_service.get_organization_by_slug_internal(org_slug)
    
    if org:
        return {
            "exists": True,
            "organization_id": org.id,
            "organization_name": org.name,
        }
    
    return {
        "exists": False,
        "organization_id": None,
        "organization_name": None,
    }


@router.post(
    "/check-permission",
    response_model=CheckPermissionResponse,
    status_code=status.HTTP_200_OK,
)
async def check_user_permission(
    request: CheckPermissionRequest,
    org_service: OrganizationServiceDep,
):
    """
    Verifica se um usuário tem permissão em uma organização.
    
    Usado para validar se o usuário pode criar modalidades/competições.
    
    Args:
        request: Contém keycloak_id, organization_slug e roles permitidas
        
    Returns:
        CheckPermissionResponse: Se o usuário tem permissão e qual sua role
    """
    result = await org_service.check_user_permission_internal(
        keycloak_id=request.keycloak_id,
        organization_slug=request.organization_slug,
        allowed_roles=request.allowed_roles,
    )
    
    logger.info(
        f"Verificação de permissão: user {request.keycloak_id} em {request.organization_slug} "
        f"- has_permission: {result.has_permission}, role: {result.role}"
    )
    
    return result

