from fastapi import APIRouter, status, Depends, Query, HTTPException
from typing import Optional, List
import logging
from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, case, and_, or_, literal, exists
from sqlalchemy.orm import joinedload
from ..schemas.organization import OrganizationResponse, OrganizationCreate, OrganizationGetPublic, OrganizationWithRole, OrganizationAdminWithRole, OrganizationUpdate, UpdateJoinPolicyRequest, OrganizationMemberResponse, OrganizersListResponse, OrganizerResponse, MembersListResponse, TeamOverviewResponse
from ..schemas.user import PendingRequestsResponse, PendingMemberRequest, UserOrgMember
from ..models.enums import OrganizationPrivacy, OrganizationJoinPolicy
from ..utils.organization_utils import can_user_join_organization
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

    exists = await session.scalar(
        select(Organization.id).where(Organization.slug == generated_slug)
    )

    if exists:
        raise HTTPException(
            status_code=409,
            detail="Já existe uma organização com esse nome."
        )

    new_org = Organization(
        name=org_data.name,
        slug=generated_slug,
        description=org_data.description,
        logo_url=org_data.logo_url,
        privacy=org_data.privacy,
        join_policy=OrganizationJoinPolicy.REQUEST_ONLY,
        owner_id=current_user.id
    )

    session.add(new_org)

    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        logger.warning(
            f"Tentativa de criar organização duplicada: {org_data.name} por usuário {current_user.id}"
        )
        raise OrganizationAlreadyExists(org_data.name)

    owner_member = OrganizationMember(
        organization_id=new_org.id,
        user_id=current_user.id,
        status=MemberStatus.ACTIVE
    )
    session.add(owner_member)

    await session.commit()
    await session.refresh(new_org)

    logger.info(
        f"Organização criada: {new_org.slug} (ID: {new_org.id}) por usuário {current_user.id}"
    )
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


@router.patch("/{org_slug}/settings/join-policy", response_model=OrganizationResponse)
async def update_organization_join_policy(org_slug: str,
                                          request: UpdateJoinPolicyRequest,
                                          user: User = Depends(AuthService.get_current_db_user),
                                          session: AsyncSession = Depends(get_session)):

    stmt = select(Organization).where(Organization.slug == org_slug)
    result = await session.execute(stmt)
    org = result.scalars().first()

    if not org:
        raise OrganizationNotFoundError(org_slug)

    if org.owner_id != user.id:
        logger.warning(f"Tentativa de atualização da política de adesão não autorizada da organização {org_slug} por usuário {user.id}")
        raise HTTPException(status_code=403, detail="Apenas o proprietário da organização pode atualizar a política de adesão.")

    org.join_policy = request.join_policy

    await session.commit()
    await session.refresh(org)

    logger.info(f"Política de adesão da organização {org_slug} atualizada para {request.join_policy.value} por usuário {user.id}")

    return org


@router.post("/{org_slug}/join-request", status_code=status.HTTP_201_CREATED)
async def request_to_join_organization(org_slug: str,
                                       user: User = Depends(AuthService.get_current_db_user),
                                       session: AsyncSession = Depends(get_session)):

    org = await session.scalar(select(Organization).where(Organization.slug == org_slug))
    if not org:
        raise OrganizationNotFoundError(org_slug)

    await can_user_join_organization(org, user, session, via_link=False)

    new_membership = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        status=MemberStatus.PENDING
    )
    session.add(new_membership)
    await session.commit()

    logger.info(f"Usuário {user.id} solicitou adesão à organização {org_slug}")

    return {
        "message": "Solicitação enviada com sucesso."
    }


@router.post("/{org_slug}/invite/{user_id}", status_code=status.HTTP_201_CREATED)
async def invite_user_to_organization(org_slug: str,
                                      user_id: str,
                                      user: User = Depends(AuthService.get_current_db_user),
                                      session: AsyncSession = Depends(get_session)):

    org_stmt = select(Organization).where(
        Organization.slug == org_slug,
        or_(
            Organization.owner_id == user.id,
            exists().where(
                and_(
                    OrganizationOrganizer.organization_id == Organization.id,
                    OrganizationOrganizer.user_id == user.id
                )
            )
        )
    )
    org = await session.scalar(org_stmt)
    if not org:
        raise HTTPException(
            status_code=403,
            detail="Apenas o proprietário ou organizador da organização pode convidar usuários."
        )

    member_is_active = await session.scalar(
        select(User).where(User.id == user_id, User.enabled == True)
    )
    if not member_is_active:
        raise HTTPException(status_code=403, detail="O usuário convidado deve ter uma conta ativa.")

    existing_membership = await session.scalar(
        select(OrganizationMember)
        .where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status.in_([MemberStatus.PENDING, MemberStatus.ACTIVE, MemberStatus.INVITED])
        )
    )
    if existing_membership:
        raise HTTPException(
            status_code=409,
            detail="O usuário já é membro ou tem uma solicitação pendente para esta organização."
        )

    new_membership = OrganizationMember(
        organization_id=org.id,
        user_id=user_id,
        status=MemberStatus.INVITED
    )
    session.add(new_membership)
    await session.commit()

    logger.info(f"Usuário {user.id} convidou o usuário {user_id} para a organização {org_slug}")
    return {
        "message": "Convite enviado com sucesso."
    }


@router.post("/{org_slug}/join-via-link", status_code=status.HTTP_201_CREATED)
async def join_organization_via_link(org_slug: str,
                                     user: User = Depends(AuthService.get_current_db_user),
                                     session: AsyncSession = Depends(get_session)):

    org = await session.scalar(select(Organization).where(Organization.slug == org_slug))
    if not org:
        raise OrganizationNotFoundError(org_slug)

    await can_user_join_organization(org, user, session, via_link=True)

    new_membership = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        status=MemberStatus.ACTIVE
    )
    session.add(new_membership)
    await session.commit()

    logger.info(f"Usuário {user.id} entrou na organização {org_slug} via link de convite")

    return {
        "message": "Você entrou na organização com sucesso via link."
    }


@router.post("/{org_slug}/approve-request/{membership_id}", status_code=status.HTTP_200_OK)
async def approve_join_request(org_slug: str,
                               membership_id: str,
                               user: User = Depends(AuthService.get_current_db_user),
                               session: AsyncSession = Depends(get_session)):

    stmt = (
        select(OrganizationMember)
        .join(Organization, OrganizationMember.organization_id == Organization.id)
        .where(
            OrganizationMember.id == membership_id,
            Organization.slug == org_slug,
            OrganizationMember.status == MemberStatus.PENDING,
            or_(
                Organization.owner_id == user.id,
                exists().where(
                    and_(
                        OrganizationOrganizer.organization_id == Organization.id,
                        OrganizationOrganizer.user_id == user.id
                    )
                )
            )
        )
    )

    membership = await session.scalar(stmt)

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Solicitação não encontrada ou você não tem permissão para aprová-la."
        )

    membership.status = MemberStatus.ACTIVE
    await session.commit()

    logger.info(f"Admin {user.id} aprovou solicitação {membership_id} do usuário {membership.user_id} na organização {org_slug}")
    return {
        "message": "Solicitação aprovada com sucesso."
    }


@router.post("/{org_slug}/reject-request/{membership_id}", status_code=status.HTTP_200_OK)
async def reject_join_request(org_slug: str,
                              membership_id: str,
                              user: User = Depends(AuthService.get_current_db_user),
                              session: AsyncSession = Depends(get_session)):

    stmt = (
        select(OrganizationMember)
        .join(Organization, OrganizationMember.organization_id == Organization.id)
        .where(
            OrganizationMember.id == membership_id,  # ✅ Busca pelo ID do membership
            Organization.slug == org_slug,
            OrganizationMember.status == MemberStatus.PENDING,
            or_(
                Organization.owner_id == user.id,
                exists().where(
                    and_(
                        OrganizationOrganizer.organization_id == Organization.id,
                        OrganizationOrganizer.user_id == user.id
                    )
                )
            )
        )
    )

    membership = await session.scalar(stmt)

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Solicitação não encontrada ou você não tem permissão para rejeitá-la."
        )

    await session.delete(membership)
    await session.commit()

    logger.info(f"Admin {user.id} rejeitou solicitação {membership_id} do usuário {membership.user_id} na organização {org_slug}")
    return {
        "message": "Solicitação rejeitada."
    }


@router.get("/{org_slug}/pending-requests", response_model=PendingRequestsResponse)
async def list_pending_join_requests(org_slug: str,
                                     user: User = Depends(AuthService.get_current_db_user),
                                     session: AsyncSession = Depends(get_session)):

    org_stmt = select(Organization).where(
        Organization.slug == org_slug,
        or_(
            Organization.owner_id == user.id,
            exists().where(
                and_(
                    OrganizationOrganizer.organization_id == Organization.id,
                    OrganizationOrganizer.user_id == user.id
                )
            )
        )
    )

    org = await session.scalar(org_stmt)

    if not org:
        raise HTTPException(
            status_code=403,
            detail="Apenas o proprietário ou organizadores podem ver solicitações pendentes."
        )

    pending_stmt = (
        select(OrganizationMember)
        .options(joinedload(OrganizationMember.user))
        .where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.status == MemberStatus.PENDING
        )
        .order_by(OrganizationMember.created_at.desc())
    )

    result = await session.execute(pending_stmt)
    pending_requests = result.scalars().all()

    requests_list = [
        PendingMemberRequest.model_validate(request)
        for request in pending_requests
    ]

    logger.info(f"Usuário {user.id} listou {len(requests_list)} solicitações pendentes da organização {org_slug}")

    return PendingRequestsResponse(
        total=len(requests_list),
        requests=requests_list
    )


@router.get("/{org_slug}/sent-invites", response_model=PendingRequestsResponse)
async def list_sent_invites(org_slug: str,
                            user: User = Depends(AuthService.get_current_db_user),
                            session: AsyncSession = Depends(get_session)):

    org_stmt = select(Organization).where(
        Organization.slug == org_slug,
        or_(
            Organization.owner_id == user.id,
            exists().where(
                and_(
                    OrganizationOrganizer.organization_id == Organization.id,
                    OrganizationOrganizer.user_id == user.id
                )
            )
        )
    )

    org = await session.scalar(org_stmt)

    if not org:
        raise HTTPException(
            status_code=403,
            detail="Apenas o proprietário ou organizadores podem ver convites enviados."
        )

    invites_stmt = (
        select(OrganizationMember)
        .options(joinedload(OrganizationMember.user))
        .where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.status == MemberStatus.INVITED
        )
        .order_by(OrganizationMember.created_at.desc())
    )

    result = await session.execute(invites_stmt)
    sent_invites = result.scalars().all()

    invites_list = [
        PendingMemberRequest.model_validate(invite)
        for invite in sent_invites
    ]

    logger.info(f"Usuário {user.id} listou {len(invites_list)} convites enviados da organização {org_slug}")

    return PendingRequestsResponse(
        total=len(invites_list),
        requests=invites_list
    )


@router.get("/{org_slug}/members", response_model=MembersListResponse)
async def list_organization_members(org_slug: str,
                                    user: User = Depends(AuthService.get_current_db_user),
                                    session: AsyncSession = Depends(get_session)):

    org = await session.scalar(
        select(Organization).where(Organization.slug == org_slug)
    )

    if not org:
        raise OrganizationNotFoundError(org_slug)

    user_membership = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MemberStatus.ACTIVE
        )
    )

    if not user_membership:
        raise HTTPException(
            status_code=403,
            detail="Apenas membros da organização podem visualizar a lista de membros."
        )

    members_stmt = (
        select(OrganizationMember)
        .options(joinedload(OrganizationMember.user))
        .where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.status == MemberStatus.ACTIVE
        )
        .order_by(OrganizationMember.created_at.asc())
    )

    result = await session.execute(members_stmt)
    members = result.scalars().all()

    members_list = []
    for member in members:
        members_list.append(
            OrganizationMemberResponse(
                id=member.id,
                user=UserOrgMember.model_validate(member.user),
                status=member.status,
                joined_at=member.created_at,
                is_owner=(member.user_id == org.owner_id)
            )
        )

    logger.info(f"Usuário {user.id} listou {len(members_list)} membros da organização {org_slug}")

    return MembersListResponse(
        total=len(members_list),
        members=members_list
    )


@router.get("/{org_slug}/organizers", response_model=OrganizersListResponse)
async def list_organization_organizers(org_slug: str,
                                       user: User = Depends(AuthService.get_current_db_user),
                                       session: AsyncSession = Depends(get_session)):

    org = await session.scalar(
        select(Organization).where(Organization.slug == org_slug)
    )

    if not org:
        raise OrganizationNotFoundError(org_slug)

    user_membership = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MemberStatus.ACTIVE
        )
    )

    if not user_membership:
        raise HTTPException(
            status_code=403,
            detail="Apenas membros da organização podem visualizar a lista de organizadores."
        )

    organizers_stmt = (
        select(OrganizationOrganizer)
        .options(joinedload(OrganizationOrganizer.user))
        .where(OrganizationOrganizer.organization_id == org.id)
        .order_by(OrganizationOrganizer.created_at.asc())
    )

    result = await session.execute(organizers_stmt)
    organizers = result.scalars().all()

    organizers_list = []
    for organizer in organizers:
        organizers_list.append(
            OrganizerResponse(
                id=organizer.id,
                user=UserOrgMember.model_validate(organizer.user),
                added_at=organizer.created_at
            )
        )

    logger.info(f"Usuário {user.id} listou {len(organizers_list)} organizadores da organização {org_slug}")

    return OrganizersListResponse(
        total=len(organizers_list),
        organizers=organizers_list
    )


@router.get("/{org_slug}/team", response_model=TeamOverviewResponse)
async def get_organization_team_overview(org_slug: str,
                                         user: User = Depends(AuthService.get_current_db_user),
                                         session: AsyncSession = Depends(get_session)):

    org_stmt = (
        select(Organization)
        .options(joinedload(Organization.owner))
        .where(Organization.slug == org_slug)
    )

    result = await session.execute(org_stmt)
    org = result.scalar_one_or_none()

    if not org:
        raise OrganizationNotFoundError(org_slug)

    user_membership = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MemberStatus.ACTIVE
        )
    )

    if not user_membership:
        raise HTTPException(
            status_code=403,
            detail="Apenas membros podem visualizar a equipe da organização."
        )

    organizers_result = await session.execute(
        select(OrganizationOrganizer)
        .options(joinedload(OrganizationOrganizer.user))
        .where(OrganizationOrganizer.organization_id == org.id)
        .order_by(OrganizationOrganizer.created_at.asc())
    )
    organizers = organizers_result.scalars().all()

    members_result = await session.execute(
        select(OrganizationMember)
        .options(joinedload(OrganizationMember.user))
        .where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.status == MemberStatus.ACTIVE
        )
        .order_by(OrganizationMember.created_at.asc())
    )
    members = members_result.scalars().all()

    organizers_list = [
        OrganizerResponse(
            id=organizer.id,
            user=UserOrgMember.model_validate(organizer.user),
            added_at=organizer.created_at
        )
        for organizer in organizers
    ]

    members_list = [
        OrganizationMemberResponse(
            id=member.id,
            user=UserOrgMember.model_validate(member.user),
            status=member.status,
            joined_at=member.created_at,
            is_owner=(member.user_id == org.owner_id)
        )
        for member in members
    ]

    logger.info(f"Usuário {user.id} visualizou equipe da organização {org_slug}")

    return TeamOverviewResponse(
        owner=UserOrgMember.model_validate(org.owner),
        organizers=organizers_list,
        members=members_list,
        total_members=len(members_list),
        total_organizers=len(organizers_list)
    )