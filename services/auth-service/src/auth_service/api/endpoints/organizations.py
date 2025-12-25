"""Endpoints de organização"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, File, Form, Query, Security, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth_service.api.deps import (
    CurrentUserDep,
    CurrentUserOptionalDep,
    OrganizationServiceDep,
    OrgRole,
)
from auth_service.infrastructure.database.models.enums import OrganizationPrivacy
from auth_service.schemas.organization import (
    MembersListResponse,
    OrganizationAdminWithRole,
    OrganizationGetPublic,
    OrganizationMemberResponse,
    OrganizationResponse,
    OrganizationWithRole,
    OrganizerResponse,
    OrganizersListResponse,
    TeamOverviewResponse,
    TransferOwnershipRequest,
    UpdateJoinPolicyRequest,
)
from auth_service.schemas.user import (
    PendingMemberRequest,
    PendingRequestsResponse,
    UserOrgMember,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/organizations", tags=["Organizations"])

optional_bearer = HTTPBearer(auto_error=False)


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization(
    org_service: OrganizationServiceDep,
    current_user: CurrentUserDep,
    name: str = Form(...),
    description: str = Form(...),
    privacy: OrganizationPrivacy = Form(...),
    logo: UploadFile | None = File(None),
):
    """Cria uma nova organização."""

    org = await org_service.create_organization(
        name=name,
        owner=current_user,
        description=description,
        privacy=privacy,
        logo=logo,
    )

    logger.info(f"Organização criada: {org.slug} por usuário {current_user.id}")
    return org


@router.get("", response_model=List[OrganizationGetPublic])
async def get_organizations(
    org_service: OrganizationServiceDep,
    privacy: Optional[OrganizationPrivacy] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Obtém todas as organizações com filtros opcionais."""

    return await org_service.get_organizations(privacy, limit, offset)


@router.get(
    "/me", response_model=List[OrganizationWithRole | OrganizationAdminWithRole]
)
async def get_my_organizations(
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
    roles: Optional[List[str]] = Query(None),
):
    """Obtém organizações onde o usuário atual tem uma função."""

    if roles is None:
        search_roles = {OrgRole.OWNER, OrgRole.ORGANIZER, OrgRole.MEMBER}
    else:
        search_roles = set(roles)

    results = await org_service.get_user_organizations(user, search_roles)

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
async def get_organization_by_slug(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserOptionalDep,
    _: HTTPAuthorizationCredentials | None = Security(optional_bearer),
):
    """Obtém organização por slug."""

    org = await org_service.get_organization_by_slug(org_slug, user)

    if user and org.owner_id == user.id:
        return org

    return OrganizationGetPublic.model_validate(org)


@router.put("/{org_slug}", response_model=OrganizationResponse)
async def update_organization(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    privacy: Optional[OrganizationPrivacy] = Form(None),
    logo: Optional[UploadFile] = File(None),
):
    """Atualiza uma organização existente."""

    update_data = {
        "name": name,
        "description": description,
        "privacy": privacy,
    }
    update_data = {k: v for k, v in update_data.items() if v is not None}

    org = await org_service.update_organization(
        slug=org_slug,
        user=user,
        data=update_data,
        logo=logo,
    )

    logger.info(f"Organização {org_slug} atualizada por usuário {user.id}")
    return org


@router.delete("/{org_slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Exclui organização (apenas proprietário)."""

    await org_service.delete_organization_by_owner(org_slug, user)
    logger.info(f"Organização {org_slug} excluída pelo proprietário {user.id}")
    return


@router.patch("/{org_slug}/settings/join-policy", response_model=OrganizationResponse)
async def update_organization_join_policy(
    org_slug: str,
    request: UpdateJoinPolicyRequest,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Atualiza política de adesão da organização (apenas proprietário)."""

    org = await org_service.update_join_policy(org_slug, user, request.join_policy)
    logger.info(
        f"Política de adesão de {org_slug} atualizada para {request.join_policy.value}"
    )
    return org


@router.post("/{org_slug}/join-request", status_code=status.HTTP_201_CREATED)
async def request_to_join_organization(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Solicita adesão a uma organização."""

    await org_service.request_to_join(org_slug, user)
    logger.info(f"Usuário {user.id} solicitou adesão à organização {org_slug}")
    return {"message": "Solicitação enviada com sucesso."}


@router.delete("/{org_slug}/join-request", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_join_request(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Cancela uma solicitação de adesão pendente."""

    await org_service.cancel_join_request(org_slug, user)
    logger.info(f"Usuário {user.id} cancelou solicitação para {org_slug}")
    return


@router.post("/{org_slug}/join-via-link", status_code=status.HTTP_201_CREATED)
async def join_organization_via_link(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Entra na organização via link."""

    await org_service.join_via_link(org_slug, user)
    logger.info(f"Usuário {user.id} entrou em {org_slug} via link")
    return {"message": "Você entrou na organização com sucesso via link."}


@router.post(
    "/{org_slug}/approve-request/{membership_id}", status_code=status.HTTP_200_OK
)
async def approve_join_request(
    org_slug: str,
    membership_id: UUID,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Aprova solicitação de adesão pendente (apenas proprietário/organizador)."""

    membership = await org_service.approve_join_request(org_slug, user, membership_id)
    logger.info(
        f"Admin {user.id} aprovou solicitação {membership_id} do usuário {membership.user_id}"
    )
    return {"message": "Solicitação aprovada com sucesso."}


@router.post(
    "/{org_slug}/reject-request/{membership_id}", status_code=status.HTTP_200_OK
)
async def reject_join_request(
    org_slug: str,
    membership_id: UUID,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Rejeita solicitação de adesão pendente (apenas proprietário/organizador)."""

    await org_service.reject_join_request(org_slug, user, membership_id)
    logger.info(f"Admin {user.id} rejeitou solicitação {membership_id}")
    return {"message": "Solicitação rejeitada."}


@router.get("/{org_slug}/pending-requests", response_model=PendingRequestsResponse)
async def list_pending_join_requests(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Lista solicitações de adesão pendentes (apenas proprietário/organizador)."""

    pending_requests = await org_service.get_pending_requests(org_slug, user)
    requests_list = [
        PendingMemberRequest.model_validate(request) for request in pending_requests
    ]
    logger.info(
        f"Usuário {user.id} listou {len(requests_list)} solicitações pendentes de {org_slug}"
    )
    return PendingRequestsResponse(total=len(requests_list), requests=requests_list)


@router.post("/{org_slug}/invite/{user_id}", status_code=status.HTTP_201_CREATED)
async def invite_user_to_organization(
    org_slug: str,
    user_id: UUID,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Convida usuário para a organização (apenas proprietário/organizador)."""

    await org_service.invite_user(org_slug, user, user_id)
    logger.info(f"Usuário {user.id} convidou {user_id} para {org_slug}")
    return {"message": "Convite enviado com sucesso."}


@router.delete("/{org_slug}/invite/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invite(
    org_slug: str,
    user_id: UUID,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Cancela convite enviado (apenas proprietário/organizador)."""

    await org_service.cancel_invite(org_slug, user, user_id)
    logger.info(f"Admin {user.id} cancelou convite de {user_id} para {org_slug}")
    return


@router.get("/{org_slug}/sent-invites", response_model=PendingRequestsResponse)
async def list_sent_invites(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Lista convites enviados (apenas proprietário/organizador)."""

    sent_invites = await org_service.get_sent_invites(org_slug, user)
    invites_list = [
        PendingMemberRequest.model_validate(invite) for invite in sent_invites
    ]
    logger.info(f"Usuário {user.id} listou {len(invites_list)} convites de {org_slug}")
    return PendingRequestsResponse(total=len(invites_list), requests=invites_list)


@router.get("/{org_slug}/members", response_model=MembersListResponse)
async def list_organization_members(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Lista membros da organização (apenas membros)."""

    org = await org_service.get_organization_by_slug(org_slug, user)
    members = await org_service.get_members(org_slug, user)

    members_list = [
        OrganizationMemberResponse(
            id=member.id,
            user=UserOrgMember.model_validate(member.user),
            status=member.status,
            joined_at=member.created_at,
            is_owner=(member.user_id == org.owner_id),
        )
        for member in members
    ]

    logger.info(f"Usuário {user.id} listou {len(members_list)} membros de {org_slug}")
    return MembersListResponse(total=len(members_list), members=members_list)


@router.delete("/{org_slug}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member_from_organization(
    org_slug: str,
    user_id: UUID,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Remove a member from organization (owner/organizer apenas)."""

    await org_service.remove_member(org_slug, user, user_id)
    logger.info(f"Usuário {user.id} removeu membro {user_id} de {org_slug}")
    return


@router.get("/{org_slug}/organizers", response_model=OrganizersListResponse)
async def list_organization_organizers(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Lista organizadores da organização (apenas membros)."""

    organizers = await org_service.get_organizers(org_slug, user)

    organizers_list = [
        OrganizerResponse(
            id=organizer.id,
            user=UserOrgMember.model_validate(organizer.user),
            added_at=organizer.created_at,
        )
        for organizer in organizers
    ]

    logger.info(
        f"Usuário {user.id} listou {len(organizers_list)} organizadores de {org_slug}"
    )
    return OrganizersListResponse(
        total=len(organizers_list), organizers=organizers_list
    )


@router.post("/{org_slug}/organizers/{user_id}", status_code=status.HTTP_201_CREATED)
async def add_organizer_to_organization(
    org_slug: str,
    user_id: UUID,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Adiciona usuário como organizador (apenas proprietário)."""

    await org_service.add_organizer(org_slug, user, user_id)
    logger.info(f"Usuário {user.id} promoveu {user_id} a organizador em {org_slug}")
    return {"message": "Organizador adicionado com sucesso."}


@router.delete(
    "/{org_slug}/organizers/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remove_organizer_from_organization(
    org_slug: str,
    user_id: UUID,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Remove organizer role from user (owner apenas)."""

    await org_service.remove_organizer(org_slug, user, user_id)
    logger.info(f"Usuário {user.id} removeu organizador {user_id} de {org_slug}")
    return


@router.get("/{org_slug}/team", response_model=TeamOverviewResponse)
async def get_organization_team_overview(
    org_slug: str,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Obtém visão geral da equipe (proprietário, organizadores, membros)."""

    team_data = await org_service.get_team_overview(org_slug, user)

    org = team_data["organization"]
    organizers = team_data["organizers"]
    members = team_data["members"]

    organizers_list = [
        OrganizerResponse(
            id=organizer.id,
            user=UserOrgMember.model_validate(organizer.user),
            added_at=organizer.created_at,
        )
        for organizer in organizers
    ]

    members_list = [
        OrganizationMemberResponse(
            id=member.id,
            user=UserOrgMember.model_validate(member.user),
            status=member.status,
            joined_at=member.created_at,
            is_owner=(member.user_id == org.owner_id),
        )
        for member in members
    ]

    logger.info(f"Usuário {user.id} visualizou equipe de {org_slug}")

    return TeamOverviewResponse(
        owner=UserOrgMember.model_validate(team_data["owner"]),
        organizers=organizers_list,
        members=members_list,
        total_members=len(members_list),
        total_organizers=len(organizers_list),
    )


@router.post("/{org_slug}/transfer-ownership", status_code=status.HTTP_200_OK)
async def transfer_organization_ownership(
    org_slug: str,
    request: TransferOwnershipRequest,
    org_service: OrganizationServiceDep,
    user: CurrentUserDep,
):
    """Transfere propriedade da organização (apenas proprietário)."""

    await org_service.transfer_ownership(org_slug, user, request.new_owner_id)
    logger.info(
        f"Propriedade de {org_slug} transferida de {user.id} para {request.new_owner_id}"
    )
    return {
        "message": "Propriedade transferida com sucesso.",
        "new_owner_id": request.new_owner_id,
    }
