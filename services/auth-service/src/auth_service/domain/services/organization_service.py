"""Serviço de organização com lógica de negócio."""

import logging
from typing import Optional, Sequence
from uuid import UUID

import httpx
from fastapi import UploadFile
from slugify import slugify

from auth_service.core.config import settings
from auth_service.core.exceptions import (
    AlreadyOwnerError,
    CannotRemoveOwnerError,
    CannotRemoveSelfError,
    InviteNotFoundError,
    JoinPolicyViolationError,
    JoinRequestNotFoundError,
    MembershipAlreadyExistsError,
    MembershipNotFoundError,
    MustBeActiveMemberError,
    NewOwnerNotActiveMemberError,
    NotActiveMemberError,
    NotMemberError,
    NotOwnerError,
    NotOwnerOrOrganizerError,
    OrganizationAccessDeniedError,
    OrganizationAlreadyExistsError,
    OrganizationInactiveError,
    OrganizationNotFoundError,
    OrganizationStatusConflictError,
    OrganizerAlreadyExistsError,
    OrganizerNotFoundError,
    OwnerCannotLeaveError,
    OwnerNotNeedOrganizerError,
    UserNotFoundError,
)
from auth_service.domain.interfaces.repositories import (
    IOrganizationMemberRepository,
    IOrganizationOrganizerRepository,
    IOrganizationRepository,
    IUserRepository,
)
from auth_service.infrastructure.database.models.enums import (
    MemberStatus,
    OrganizationJoinPolicy,
    OrganizationPrivacy,
    OrganizationStatus,
)
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationMember,
    OrganizationOrganizer,
)
from auth_service.infrastructure.database.models.user_model import User
from auth_service.infrastructure.repositories.organization_member_repository import (
    OrgRole,
)
from auth_service.utils.upload_image import upload_image

logger = logging.getLogger(__name__)


class OrganizationService:
    """Serviço contendo toda lógica de negócio relacionada a organização."""

    def __init__(
        self,
        org_repository: IOrganizationRepository,
        member_repository: IOrganizationMemberRepository,
        organizer_repository: IOrganizationOrganizerRepository,
        user_repository: IUserRepository,
    ):
        self._org_repo = org_repository
        self._member_repo = member_repository
        self._organizer_repo = organizer_repository
        self._user_repo = user_repository
    
    async def _send_notification(
        self,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        organization: Organization,
        extra_data: dict = None,
        action_url: str = None
    ):
        """Helper para enviar notificações de forma consistente."""
        try:
            base_extra_data = {
                "organization_id": str(organization.id),
                "organization_name": organization.name,
                "organization_slug": organization.slug,
            }
            
            if extra_data:
                base_extra_data.update(extra_data)
            
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8003/api/v1/notifications/send",
                    json={
                        "user_id": str(user_id),
                        "type": notification_type,
                        "title": title,
                        "message": message,
                        "extra_data": base_extra_data,
                        "action_url": action_url or f"/organizations/{organization.slug}"
                    },
                    timeout=5.0
                )
                logger.info(f"Notificação {notification_type} enviada para {user_id}")
        except Exception as e:
            logger.error(f"Erro ao enviar notificação {notification_type}: {e}")

    async def create_organization(
        self,
        name: str,
        owner: User,
        description: Optional[str] = None,
        privacy: OrganizationPrivacy = OrganizationPrivacy.PUBLIC,
        logo: UploadFile | None = None,
    ) -> Organization:
        generated_slug = slugify(name)

        if await self._org_repo.exists_by_slug(generated_slug):
            raise OrganizationAlreadyExistsError(name)

        new_org = Organization(
            name=name,
            slug=generated_slug,
            description=description,
            privacy=privacy,
            join_policy=OrganizationJoinPolicy.REQUEST_ONLY,
            owner_id=owner.id,
        )

        created_org = await self._org_repo.create(new_org)

        owner_member = OrganizationMember(
            organization_id=created_org.id,
            user_id=owner.id,
            status=MemberStatus.ACTIVE,
        )
        await self._member_repo.create(owner_member)

        if logo:
            result = upload_image(
                file=logo,
                organization_id=str(created_org.id),
                aws_access_key_id=settings.AWS_BUCKET_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_BUCKET_SECRET_ACCESS_KEY,
                aws_region=settings.AWS_BUCKET_REGION,
                aws_bucket=settings.AWS_BUCKET_NAME,
                prefix="organizations",
            )
            created_org.logo_url = result["url"]

        await self._org_repo.commit()
        
        await self._org_repo._session.refresh(created_org)

        logger.info(f"Organização criada: {created_org.slug} por usuário {owner.id}")
        return created_org

    async def get_organization_by_slug(
        self, slug: str, user: Optional[User] = None
    ) -> Organization:
        """
        Obter organização por slug com controle de acesso.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            OrganizationAccessDeniedError: Se o usuário não tiver acesso.
            OrganizationInactiveError: Se a organização estiver inativa/excluída.
        """

        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)
        
        if user and org.owner_id == user.id:
            if org.status in {OrganizationStatus.ACTIVE, OrganizationStatus.PENDING}:
                return org
        
        if org.status != OrganizationStatus.ACTIVE:
            raise OrganizationInactiveError()

        if user:
            user_role = await self._get_user_role_in_org(org, user)

            if user_role == OrgRole.OWNER:
                return org

            if user_role == OrgRole.NONE and org.privacy == OrganizationPrivacy.PRIVATE:
                raise OrganizationAccessDeniedError(
                    "Acesso negado à organização privada."
                )

        else:
            if org.privacy == OrganizationPrivacy.PRIVATE:
                raise OrganizationAccessDeniedError(
                    "Acesso negado à organização privada."
                )

        return org

    async def get_organizations(
        self,
        privacy: Optional[OrganizationPrivacy] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Organization]:
        """Obtém todas as organizações com filtros opcionais."""
        return await self._org_repo.get_all(privacy, limit, offset)

    async def get_organizations_by_status(
        self, status_filter: OrganizationStatus
    ) -> Sequence[Organization]:
        """Obtém organizações por status (para admin)."""
        return await self._org_repo.get_all_admin(status_filter)

    async def get_user_organizations(
        self, user: User, roles: Optional[set[str]] = None
    ) -> Sequence[tuple[Organization, str]]:
        """Obtém organizações onde o usuário tem as funções especificadas."""
        if roles is None:
            roles = {OrgRole.OWNER, OrgRole.ORGANIZER, OrgRole.MEMBER}

        return await self._member_repo.get_user_organizations_with_role(user.id, roles)

    async def update_organization(
        self,
        slug: str,
        user: User,
        data: dict,
        logo: UploadFile | None = None,
    ) -> Organization:
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.owner_id != user.id:
            raise NotOwnerError("atualizar a organização")

        if logo:
            result = upload_image(
                file=logo,
                organization_id=str(org.id),
                aws_access_key_id=settings.AWS_BUCKET_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_BUCKET_SECRET_ACCESS_KEY,
                aws_region=settings.AWS_BUCKET_REGION,
                aws_bucket=settings.AWS_BUCKET_NAME,
                prefix="organizations",
            )
            data["logo_url"] = result["url"]

        updated_org = await self._org_repo.update(org.id, data)
        await self._org_repo.commit()

        return updated_org

    async def delete_organization_by_owner(self, slug: str, user: User) -> None:
        """
        Delete organization by owner.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            NotOwnerError: Se o usuário não for o proprietário.
            OrganizationInactiveError: Se a organização já estiver inativa.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.owner_id != user.id:
            logger.warning(
                f"Tentativa de exclusão não autorizada de {slug} por {user.id}"
            )
            raise NotOwnerError("excluir a organização")

        if org.status in {
            OrganizationStatus.EXCLUDED,
            OrganizationStatus.REJECTED,
            OrganizationStatus.SUSPENDED,
        }:
            raise OrganizationInactiveError()

        if org.status in {OrganizationStatus.PENDING, OrganizationStatus.ACTIVE}:
            org.status = OrganizationStatus.EXCLUDED
            await self._org_repo.commit()
            logger.info(f"Organização {slug} excluída pelo proprietário {user.id}")
        else:
            raise OrganizationStatusConflictError(
                "Não é permitido excluir a organização neste estado."
            )

    async def update_join_policy(
        self, slug: str, user: User, join_policy: OrganizationJoinPolicy
    ) -> Organization:
        """
        Update organization join policy.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            NotOwnerError: Se o usuário não for o proprietário.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.owner_id != user.id:
            logger.warning(
                f"Tentativa de atualização de política não autorizada por {user.id}"
            )
            raise NotOwnerError("atualizar a política de adesão")

        org.join_policy = join_policy
        await self._org_repo.commit()
        
        org = await self._org_repo.get_by_slug(slug)

        logger.info(f"Política de adesão de {slug} atualizada para {join_policy.value}")
        return org

    async def request_to_join(self, slug: str, user: User) -> OrganizationMember:
        """
        Request to join an organization.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            MembershipAlreadyExistsError: Se já for membro ou tiver solicitação pendente.
            JoinPolicyViolationError: Se a política de adesão não permitir solicitações.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        await self._validate_can_join(org, user, via_link=False)

        new_membership = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            status=MemberStatus.PENDING,
        )
        created = await self._member_repo.create(new_membership)
        await self._member_repo.commit()

        logger.info(f"Usuário {user.id} solicitou adesão à organização {slug}")
        
        user_name = user.username
        if user.first_name:
            if user.last_name:
                user_name = f"{user.first_name} {user.last_name}"
            else:
                user_name = user.first_name
        
        await self._send_notification(
            user_id=org.owner_id,
            notification_type="organization_join_request",
            title="Nova Solicitação de Entrada",
            message=f"{user_name} solicitou entrar em {org.name}",
            organization=org,
            extra_data={
                "requester_name": user_name,
                "requester_id": str(user.id),
                "membership_id": str(created.id),
            },
            action_url=f"/organizations/{org.slug}/requests"
        )
        
        organizers = await self._organizer_repo.get_organizers_by_org(org.id)
        for organizer in organizers:
            await self._send_notification(
                user_id=organizer.user_id,
                notification_type="organization_join_request",
                title="Nova Solicitação de Entrada",
                message=f"{user_name} solicitou entrar em {org.name}",
                organization=org,
                extra_data={
                    "requester_name": user_name,
                    "requester_id": str(user.id),
                    "membership_id": str(created.id),
                },
                action_url=f"/organizations/{org.slug}/requests"
            )
        
        return created

    async def cancel_join_request(self, slug: str, user: User) -> None:
        """
        Cancel a pending join request.

        Raises:
            JoinRequestNotFoundError: Se nenhuma solicitação pendente for encontrada.
        """
        membership = await self._member_repo.get_membership_by_slug_and_status(
            slug, user.id, MemberStatus.PENDING
        )

        if not membership:
            raise JoinRequestNotFoundError()

        await self._member_repo.delete(membership)
        await self._member_repo.commit()

        logger.info(f"Usuário {user.id} cancelou solicitação para {slug}")

    async def join_via_link(self, slug: str, user: User) -> OrganizationMember:
        """
        Join organization via link.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            MembershipAlreadyExistsError: Se já for membro.
            JoinPolicyViolationError: Se a política de adesão não permitir entrada via link.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        await self._validate_can_join(org, user, via_link=True)

        new_membership = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            status=MemberStatus.ACTIVE,
        )
        created = await self._member_repo.create(new_membership)
        await self._member_repo.commit()

        logger.info(f"Usuário {user.id} entrou em {slug} via link")
        return created

    async def accept_invite(self, slug: str, user: User) -> None:
        """
        Accept an organization invite.

        Raises:
            InviteNotFoundError: Se nenhum convite pendente for encontrado.
        """
        membership = await self._member_repo.get_membership_by_slug_and_status(
            slug, user.id, MemberStatus.INVITED
        )

        if not membership:
            raise InviteNotFoundError()

        await self._member_repo.update_status(membership, MemberStatus.ACTIVE)
        await self._member_repo.commit()

        logger.info(f"Usuário {user.id} aceitou convite para {slug}")

        org = await self._org_repo.get_by_slug(slug)
        if org:
            try:
                member_name = user.username
                if user.first_name:
                    if user.last_name:
                        member_name = f"{user.first_name} {user.last_name}"
                    else:
                        member_name = user.first_name
                
                async with httpx.AsyncClient() as client:
                    await client.post(
                        "http://localhost:8003/api/v1/notifications/send",
                        json={
                            "user_id": str(org.owner_id),
                            "type": "organization_accepted",
                            "title": "Convite Aceito",
                            "message": f"{member_name} aceitou o convite para sua organização",
                            "extra_data": {
                                "organization_id": str(org.id),
                                "organization_name": org.name,
                                "organization_slug": org.slug,
                                "member_name": member_name,
                                "member_id": str(user.id)
                            },
                            "action_url": f"/organizations/{org.slug}/members"
                        },
                        timeout=5.0
                    )
                    logger.info(f"Notificação de aceite enviada para owner {org.owner_id}")
            except Exception as e:
                logger.error(f"Erro ao enviar notificação de aceite: {e}")

    async def decline_invite(self, slug: str, user: User) -> None:
        """
        Decline an organization invite.

        Raises:
            InviteNotFoundError: Se nenhum convite pendente for encontrado.
        """
        membership = await self._member_repo.get_membership_by_slug_and_status(
            slug, user.id, MemberStatus.INVITED
        )

        if not membership:
            raise InviteNotFoundError()

        org = await self._org_repo.get_by_id(membership.organization_id)
        
        await self._member_repo.delete(membership)
        await self._member_repo.commit()

        logger.info(f"Usuário {user.id} recusou convite para {slug}")
        
        if org:
            user_name = user.username
            if user.first_name:
                if user.last_name:
                    user_name = f"{user.first_name} {user.last_name}"
                else:
                    user_name = user.first_name
            
            await self._send_notification(
                user_id=org.owner_id,
                notification_type="organization_invite_declined",
                title="Convite recusado",
                message=f"{user_name} recusou o convite para {org.name}",
                organization=org,
                extra_data={
                    "declined_by_id": str(user.id),
                    "declined_by_name": user_name,
                },
                action_url=f"/organizations/{org.slug}"
            )
            
            organizers = await self._organizer_repo.get_organizers_by_org(org.id)
            for organizer in organizers:
                await self._send_notification(
                    user_id=organizer.user_id,
                    notification_type="organization_invite_declined",
                    title="Convite recusado",
                    message=f"{user_name} recusou o convite para {org.name}",
                    organization=org,
                    extra_data={
                        "declined_by_id": str(user.id),
                        "declined_by_name": user_name,
                    },
                    action_url=f"/organizations/{org.slug}"
                )

    async def leave_organization(self, slug: str, user: User) -> None:
        """
        Leave an organization.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            OwnerCannotLeaveError: Se o usuário for o proprietário.
            NotActiveMemberError: Se o usuário não for um membro ativo.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.owner_id == user.id:
            raise OwnerCannotLeaveError()

        organizer = await self._organizer_repo.get_organizer(org.id, user.id)
        if organizer:
            await self._organizer_repo.delete(organizer)

        membership = await self._member_repo.get_membership_by_status(
            org.id, user.id, MemberStatus.ACTIVE
        )

        if not membership:
            raise NotActiveMemberError()

        await self._member_repo.delete(membership)
        await self._member_repo.commit()

        logger.info(f"Usuário {user.id} saiu da organização {slug}")
        
        user_name = user.username
        if user.first_name:
            if user.last_name:
                user_name = f"{user.first_name} {user.last_name}"
            else:
                user_name = user.first_name
        
        await self._send_notification(
            user_id=org.owner_id,
            notification_type="organization_member_left",
            title="Um membro saiu da organização",
            message=f"{user_name} saiu de {org.name}",
            organization=org,
            extra_data={
                "member_id": str(user.id),
                "member_name": user_name,
            },
            action_url=f"/organizations/{org.slug}"
        )
        
        organizers = await self._organizer_repo.get_organizers_by_org(org.id)
        for organizer in organizers:
            await self._send_notification(
                user_id=organizer.user_id,
                notification_type="organization_member_left",
                title="Um membro saiu da organização",
                message=f"{user_name} saiu de {org.name}",
                organization=org,
                extra_data={
                    "member_id": str(user.id),
                    "member_name": user_name,
                },
                action_url=f"/organizations/{org.slug}"
            )

    async def invite_user(self, slug: str, inviter: User, user_id: UUID) -> None:
        """
        Invite a user to organization.

        Raises:
            NotOwnerOrOrganizerError: Se o convidador não for proprietário ou organizador.
            UserNotFoundError: Se o usuário convidado não for encontrado ou não estiver ativo.
            MembershipAlreadyExistsError: Se o usuário já tiver relacionamento.
            OrganizationInactiveError: Se a organização não estiver ativa.
        """
        org = await self._organizer_repo.is_owner_or_organizer(slug, inviter.id)

        if not org:
            raise NotOwnerOrOrganizerError("convidar usuários")

        if org.status != OrganizationStatus.ACTIVE:
            raise OrganizationInactiveError()

        invited_user = await self._user_repo.get_by_id(user_id)
        if not invited_user or not invited_user.enabled:
            raise UserNotFoundError(str(user_id))

        if await self._member_repo.exists_membership(
            org.id,
            user_id,
            [MemberStatus.PENDING, MemberStatus.ACTIVE, MemberStatus.INVITED],
        ):
            raise MembershipAlreadyExistsError()

        new_membership = OrganizationMember(
            organization_id=org.id,
            user_id=user_id,
            status=MemberStatus.INVITED,
        )
        await self._member_repo.create(new_membership)
        await self._member_repo.commit()

        logger.info(f"Usuário {inviter.id} convidou {user_id} para {slug}")

        try:
            inviter_name = inviter.username
            if inviter.first_name:
                if inviter.last_name:
                    inviter_name = f"{inviter.first_name} {inviter.last_name}"
                else:
                    inviter_name = inviter.first_name
            
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8003/api/v1/notifications/send",
                    json={
                        "user_id": str(user_id),
                        "type": "organization_invite",
                        "title": "Convite para Organização",
                        "message": f"Você foi convidado para participar de {org.name}",
                        "extra_data": {
                            "organization_id": str(org.id),
                            "organization_name": org.name,
                            "organization_slug": org.slug,
                            "inviter_name": inviter_name,
                            "inviter_id": str(inviter.id),
                            "role": "member"
                        },
                        "action_url": f"/organizations/{org.slug}/invites"
                    },
                    timeout=5.0
                )
                logger.info(f"Notificação de convite enviada para {user_id}")
        except Exception as e:
            logger.error(f"Erro ao enviar notificação de convite: {e}")

    async def cancel_invite(self, slug: str, admin: User, user_id: UUID) -> None:
        """
        Cancel a sent invite.

        Raises:
            NotOwnerOrOrganizerError: Se o admin não for proprietário ou organizador.
            InviteNotFoundError: Se o convite não for encontrado.
            OrganizationInactiveError: Se a organização não estiver ativa.
        """
        org = await self._organizer_repo.is_owner_or_organizer(slug, admin.id)

        if not org:
            raise NotOwnerOrOrganizerError("cancelar convites")

        if org.status != OrganizationStatus.ACTIVE:
            raise OrganizationInactiveError()

        membership = await self._member_repo.get_membership_by_status(
            org.id, user_id, MemberStatus.INVITED
        )

        if not membership:
            raise InviteNotFoundError()

        await self._member_repo.delete(membership)
        await self._member_repo.commit()

        logger.info(f"Admin {admin.id} cancelou convite de {user_id} para {slug}")
        
        invited_user = await self._user_repo.get_by_id(user_id)
        if invited_user:
            await self._send_notification(
                user_id=invited_user.id,
                notification_type="organization_invite_cancelled",
                title="Convite cancelado",
                message=f"O convite para {org.name} foi cancelado",
                organization=org,
                extra_data={
                    "cancelled_by_id": str(admin.id),
                },
                action_url="/organizations"
            )

    async def approve_join_request(
        self, slug: str, admin: User, membership_id: UUID
    ) -> OrganizationMember:
        """
        Approve a pending join request.

        Raises:
            MembershipNotFoundError: Se a solicitação não for encontrada ou sem permissão.
            OrganizationInactiveError: Se a organização não estiver ativa.
        """
        membership = await self._member_repo.get_pending_membership_for_approval(
            membership_id, slug, admin.id
        )

        if not membership:
            raise MembershipNotFoundError(
                "Solicitação não encontrada ou você não tem permissão para aprová-la."
            )

        org = await self._org_repo.get_by_slug(slug)
        if org and org.status != OrganizationStatus.ACTIVE:
            raise OrganizationInactiveError()

        await self._member_repo.update_status(membership, MemberStatus.ACTIVE)
        await self._member_repo.commit()

        logger.info(f"Admin {admin.id} aprovou solicitação {membership_id}")
        
        requester = await self._user_repo.get_by_id(membership.user_id)
        if requester and org:
            await self._send_notification(
                user_id=requester.id,
                notification_type="organization_request_approved",
                title="Solicitação Aprovada",
                message=f"Sua solicitação para entrar em {org.name} foi aprovada!",
                organization=org,
                extra_data={
                    "approver_id": str(admin.id),
                },
                action_url=f"/organizations/{org.slug}"
            )
        
        return membership

    async def reject_join_request(
        self, slug: str, admin: User, membership_id: UUID
    ) -> None:
        """
        Reject a pending join request.

        Raises:
            MembershipNotFoundError: Se a solicitação não for encontrada ou sem permissão.
            OrganizationInactiveError: Se a organização não estiver ativa.
        """
        membership = await self._member_repo.get_pending_membership_for_approval(
            membership_id, slug, admin.id
        )

        if not membership:
            raise MembershipNotFoundError(
                "Solicitação não encontrada ou você não tem permissão para rejeitá-la."
            )

        org = await self._org_repo.get_by_slug(slug)
        if org and org.status != OrganizationStatus.ACTIVE:
            raise OrganizationInactiveError()

        await self._member_repo.delete(membership)
        await self._member_repo.commit()

        logger.info(f"Admin {admin.id} rejeitou solicitação {membership_id}")
        
        requester = await self._user_repo.get_by_id(membership.user_id)
        if requester and org:
            await self._send_notification(
                user_id=requester.id,
                notification_type="organization_request_rejected",
                title="Solicitação Rejeitada",
                message=f"Sua solicitação para entrar em {org.name} foi rejeitada",
                organization=org,
                extra_data={
                    "rejecter_id": str(admin.id),
                },
                action_url=f"/organizations"
            )

    async def remove_member(self, slug: str, admin: User, member_user_id: UUID) -> None:
        """
        Remove a member from organization.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            NotOwnerOrOrganizerError: Se o admin não for proprietário ou organizador.
            CannotRemoveOwnerError: Se tentar remover o proprietário.
            CannotRemoveSelfError: Se tentar remover a si mesmo.
            MembershipNotFoundError: Se o membro não for encontrado.
            OrganizationInactiveError: Se a organização não estiver ativa.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.status != OrganizationStatus.ACTIVE:
            raise OrganizationInactiveError()

        is_owner = org.owner_id == admin.id
        is_organizer = await self._organizer_repo.is_organizer(org.id, admin.id)

        if not (is_owner or is_organizer):
            raise NotOwnerOrOrganizerError("remover membros")

        if member_user_id == org.owner_id:
            raise CannotRemoveOwnerError()

        if member_user_id == admin.id:
            raise CannotRemoveSelfError()

        membership = await self._member_repo.get_membership_by_status(
            org.id, member_user_id, MemberStatus.ACTIVE
        )

        if not membership:
            raise MembershipNotFoundError()

        organizer = await self._organizer_repo.get_organizer(org.id, member_user_id)
        if organizer:
            await self._organizer_repo.delete(organizer)

        await self._member_repo.delete(membership)
        await self._member_repo.commit()

        logger.info(f"Admin {admin.id} removeu membro {member_user_id} da organização {slug}")
        
        removed_user = await self._user_repo.get_by_id(member_user_id)
        if removed_user:
            await self._send_notification(
                user_id=removed_user.id,
                notification_type="organization_member_removed",
                title="Você foi removido de uma organização",
                message=f"Você foi removido da organização {org.name}",
                organization=org,
                extra_data={
                    "removed_by_id": str(admin.id),
                },
                action_url="/organizations"
            )

        logger.info(f"Admin {admin.id} removeu membro {member_user_id} de {slug}")

    async def get_pending_requests(
        self, slug: str, user: User
    ) -> Sequence[OrganizationMember]:
        """
        Get pending join requests.

        Raises:
            NotOwnerOrOrganizerError: Se o usuário não for proprietário ou organizador.
        """
        org = await self._organizer_repo.is_owner_or_organizer(slug, user.id)

        if not org:
            raise NotOwnerOrOrganizerError("ver solicitações pendentes")

        return await self._member_repo.get_pending_requests(org.id)

    async def get_sent_invites(
        self, slug: str, user: User
    ) -> Sequence[OrganizationMember]:
        """
        Get sent invites.

        Raises:
            NotOwnerOrOrganizerError: Se o usuário não for proprietário ou organizador.
        """
        org = await self._organizer_repo.is_owner_or_organizer(slug, user.id)

        if not org:
            raise NotOwnerOrOrganizerError("ver convites enviados")

        return await self._member_repo.get_sent_invites(org.id)

    async def get_user_invites(self, user: User) -> Sequence[OrganizationMember]:
        """
        Get all organization invites received by user (status INVITED).

        Returns list of pending invites to organizations.
        """
        return await self._member_repo.get_user_invites(user.id)

    async def get_user_requests(self, user: User) -> Sequence[OrganizationMember]:
        """
        Get all organization requests sent by user (status REQUESTED).

        Returns list of pending requests to join organizations.
        """
        return await self._member_repo.get_user_requests(user.id)

    async def get_members(self, slug: str, user: User) -> Sequence[OrganizationMember]:
        """
        Get organization members.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            NotMemberError: Se o usuário não for um membro.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        membership = await self._member_repo.get_membership_by_status(
            org.id, user.id, MemberStatus.ACTIVE
        )

        if not membership:
            raise NotMemberError("visualizar a lista de membros")

        return await self._member_repo.get_members_by_org(org.id, MemberStatus.ACTIVE)

    async def get_organizers(
        self, slug: str, user: User
    ) -> Sequence[OrganizationOrganizer]:
        """
        Get organization organizers.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            NotMemberError: Se o usuário não for um membro.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        membership = await self._member_repo.get_membership_by_status(
            org.id, user.id, MemberStatus.ACTIVE
        )

        if not membership:
            raise NotMemberError("visualizar a lista de organizadores")

        return await self._organizer_repo.get_organizers_by_org(org.id)

    async def add_organizer(
        self, slug: str, owner: User, user_id: UUID
    ) -> OrganizationOrganizer:
        """
        Add a user as organizer.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            NotOwnerError: Se o usuário não for o proprietário.
            OwnerNotNeedOrganizerError: Se tentar tornar o proprietário um organizador.
            OrganizerAlreadyExistsError: Se o usuário já for um organizador.
            MustBeActiveMemberError: Se o usuário não for um membro ativo.
            OrganizationInactiveError: Se a organização não estiver ativa.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.status != OrganizationStatus.ACTIVE:
            raise OrganizationInactiveError()

        if org.owner_id != owner.id:
            raise NotOwnerError("adicionar organizadores")

        if user_id == org.owner_id:
            raise OwnerNotNeedOrganizerError()

        existing = await self._organizer_repo.get_organizer(org.id, user_id)
        if existing:
            raise OrganizerAlreadyExistsError()

        membership = await self._member_repo.get_membership_by_status(
            org.id, user_id, MemberStatus.ACTIVE
        )

        if not membership:
            raise MustBeActiveMemberError()

        new_organizer = OrganizationOrganizer(organization_id=org.id, user_id=user_id)
        created = await self._organizer_repo.create(new_organizer)
        await self._organizer_repo.commit()

        logger.info(f"Usuário {owner.id} promoveu {user_id} a organizador em {slug}")
        
        promoted_user = await self._user_repo.get_by_id(user_id)
        if promoted_user:
            await self._send_notification(
                user_id=promoted_user.id,
                notification_type="organization_organizer_added",
                title="Você foi promovido a organizador",
                message=f"Você agora é organizador de {org.name}",
                organization=org,
                extra_data={
                    "promoted_by_id": str(owner.id),
                },
                action_url=f"/organizations/{org.slug}"
            )
        
        return created

    async def remove_organizer(self, slug: str, owner: User, user_id: UUID) -> None:
        """
        Remove organizer role from user.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            NotOwnerError: Se o usuário não for o proprietário.
            OrganizerNotFoundError: Se o usuário não for um organizador.
            OrganizationInactiveError: Se a organização não estiver ativa.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.status != OrganizationStatus.ACTIVE:
            raise OrganizationInactiveError()

        if org.owner_id != owner.id:
            raise NotOwnerError("remover organizadores")

        if user_id == org.owner_id:
            raise OrganizerNotFoundError()

        organizer = await self._organizer_repo.get_organizer(org.id, user_id)

        if not organizer:
            raise OrganizerNotFoundError()

        await self._organizer_repo.delete(organizer)
        await self._organizer_repo.commit()

        logger.info(f"Usuário {owner.id} removeu organizador {user_id} de {slug}")
        
        demoted_user = await self._user_repo.get_by_id(user_id)
        if demoted_user:
            await self._send_notification(
                user_id=demoted_user.id,
                notification_type="organization_organizer_removed",
                title="Você não é mais organizador",
                message=f"Você não é mais organizador de {org.name}",
                organization=org,
                extra_data={
                    "removed_by_id": str(owner.id),
                },
                action_url=f"/organizations/{org.slug}"
            )

    async def transfer_ownership(
        self, slug: str, owner: User, new_owner_id: UUID
    ) -> Organization:
        """
        Transfer organization ownership.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            NotOwnerError: Se o usuário não for o proprietário atual.
            AlreadyOwnerError: Se tentar transferir para si mesmo.
            NewOwnerNotActiveMemberError: Se o novo proprietário não for um membro ativo.
            UserNotFoundError: Se o novo proprietário não for encontrado ou estiver desabilitado.
            OrganizationInactiveError: Se a organização não estiver ativa.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.status != OrganizationStatus.ACTIVE:
            raise OrganizationInactiveError()

        if org.owner_id != owner.id:
            raise NotOwnerError("transferir a propriedade")

        if new_owner_id == owner.id:
            raise AlreadyOwnerError()

        membership = await self._member_repo.get_membership_by_status(
            org.id, new_owner_id, MemberStatus.ACTIVE
        )

        if not membership:
            raise NewOwnerNotActiveMemberError()

        new_owner_user = await self._user_repo.get_by_id(new_owner_id)
        if not new_owner_user or not new_owner_user.enabled:
            raise UserNotFoundError(str(new_owner_id))

        old_owner_id = org.owner_id
        org.owner_id = new_owner_id
        await self._org_repo.commit()

        logger.info(
            f"Propriedade de {slug} transferida de {old_owner_id} para {new_owner_id}"
        )
        
        new_owner_name = new_owner_user.username
        if new_owner_user.first_name:
            if new_owner_user.last_name:
                new_owner_name = f"{new_owner_user.first_name} {new_owner_user.last_name}"
            else:
                new_owner_name = new_owner_user.first_name
        
        await self._send_notification(
            user_id=new_owner_id,
            notification_type="organization_ownership_received",
            title="Você é o novo proprietário",
            message=f"Você agora é o proprietário de {org.name}",
            organization=org,
            extra_data={
                "previous_owner_id": str(old_owner_id),
            },
            action_url=f"/organizations/{org.slug}"
        )
        
        await self._send_notification(
            user_id=old_owner_id,
            notification_type="organization_ownership_transferred",
            title="Propriedade transferida",
            message=f"A propriedade de {org.name} foi transferida para {new_owner_name}",
            organization=org,
            extra_data={
                "new_owner_id": str(new_owner_id),
                "new_owner_name": new_owner_name,
            },
            action_url=f"/organizations/{org.slug}"
        )
        
        return org

    async def get_team_overview(self, slug: str, user: User) -> dict:
        """
        Get team overview (owner, organizers, members).

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            NotMemberError: Se o usuário não for um membro.
        """
        org = await self._org_repo.get_by_slug_with_owner(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        membership = await self._member_repo.get_membership_by_status(
            org.id, user.id, MemberStatus.ACTIVE
        )

        if not membership:
            raise NotMemberError("visualizar a equipe da organização")

        organizers = await self._organizer_repo.get_organizers_by_org(org.id)
        members = await self._member_repo.get_members_by_org(
            org.id, MemberStatus.ACTIVE
        )

        return {
            "organization": org,
            "owner": org.owner,
            "organizers": organizers,
            "members": members,
        }

    async def admin_delete_organization(self, slug: str) -> None:
        """
        Admin action to delete/reject organization.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            OrganizationInactiveError: Se a organização já estiver inativa.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.status in {
            OrganizationStatus.EXCLUDED,
            OrganizationStatus.REJECTED,
            OrganizationStatus.SUSPENDED,
        }:
            raise OrganizationInactiveError()

        if org.status == OrganizationStatus.PENDING:
            org.status = OrganizationStatus.REJECTED
            logger.info(f"Organização {slug} rejeitada por admin")
            action_text = "rejeitada"
        else:
            org.status = OrganizationStatus.EXCLUDED
            logger.info(f"Organização {slug} excluída por admin")
            action_text = "excluída"

        await self._org_repo.commit()
        
        await self._send_notification(
            user_id=org.owner_id,
            notification_type="organization_deleted",
            title=f"Organização {action_text}",
            message=f"A organização {org.name} foi {action_text} pela plataforma",
            organization=org,
            extra_data={
                "action": action_text,
            },
            action_url="/organizations"
        )
        
        active_members = await self._member_repo.get_members(org.id)
        for member in active_members:
            if member.status == MemberStatus.ACTIVE and member.user_id != org.owner_id:
                await self._send_notification(
                    user_id=member.user_id,
                    notification_type="organization_deleted",
                    title=f"Organização {action_text}",
                    message=f"A organização {org.name} foi {action_text} pela plataforma",
                    organization=org,
                    extra_data={
                        "action": action_text,
                    },
                    action_url="/organizations"
                )

    async def admin_accept_organization(self, slug: str) -> Organization:
        """
        Admin action to accept pending organization.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            OrganizationStatusConflictError: Se a organização não estiver pendente.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.status != OrganizationStatus.PENDING:
            raise OrganizationStatusConflictError(
                "Apenas organizações pendentes podem ser aceitas."
            )

        org.status = OrganizationStatus.ACTIVE
        await self._org_repo.commit()

        logger.info(f"Organização {slug} aceita por admin")
        
        await self._send_notification(
            user_id=org.owner_id,
            notification_type="organization_approved",
            title="Organização aprovada",
            message=f"Sua organização {org.name} foi aprovada pela plataforma!",
            organization=org,
            extra_data={},
            action_url=f"/organizations/{org.slug}"
        )
        
        return org

    async def admin_suspend_organization(self, slug: str) -> None:
        """
        Admin action to suspend organization.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            OrganizationStatusConflictError: Se a organização já estiver suspensa.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.status == OrganizationStatus.SUSPENDED:
            raise OrganizationStatusConflictError("Organização já está suspensa.")

        org.status = OrganizationStatus.SUSPENDED
        await self._org_repo.commit()

        logger.info(f"Organização {slug} suspensa por admin")
        
        await self._send_notification(
            user_id=org.owner_id,
            notification_type="organization_suspended",
            title="Organização suspensa",
            message=f"A organização {org.name} foi suspensa pela plataforma",
            organization=org,
            extra_data={},
            action_url=f"/organizations/{org.slug}"
        )
        
        organizers = await self._organizer_repo.get_organizers_by_org(org.id)
        for organizer in organizers:
            await self._send_notification(
                user_id=organizer.user_id,
                notification_type="organization_suspended",
                title="Organização suspensa",
                message=f"A organização {org.name} foi suspensa pela plataforma",
                organization=org,
                extra_data={},
                action_url=f"/organizations/{org.slug}"
            )

    async def admin_unsuspend_organization(self, slug: str) -> None:
        """
        Admin action to unsuspend organization.

        Raises:
            OrganizationNotFoundError: Se a organização não for encontrada.
            OrganizationStatusConflictError: Se a organização não estiver suspensa.
        """
        org = await self._org_repo.get_by_slug(slug)

        if not org:
            raise OrganizationNotFoundError(slug)

        if org.status != OrganizationStatus.SUSPENDED:
            raise OrganizationStatusConflictError("Organização não está suspensa.")

        org.status = OrganizationStatus.ACTIVE
        await self._org_repo.commit()

        logger.info(f"Organização {slug} reativada por admin")
        
        await self._send_notification(
            user_id=org.owner_id,
            notification_type="organization_unsuspended",
            title="Organização reativada",
            message=f"A organização {org.name} foi reativada!",
            organization=org,
            extra_data={},
            action_url=f"/organizations/{org.slug}"
        )
        
        organizers = await self._organizer_repo.get_organizers_by_org(org.id)
        for organizer in organizers:
            await self._send_notification(
                user_id=organizer.user_id,
                notification_type="organization_unsuspended",
                title="Organização reativada",
                message=f"A organização {org.name} foi reativada!",
                organization=org,
                extra_data={},
                action_url=f"/organizations/{org.slug}"
            )

    async def get_all_organizations_admin(
        self, status_filter: Optional[OrganizationStatus] = None
    ) -> Sequence[Organization]:
        """Obtém todas as organizações com filtro de status (apenas admin)."""
        return await self._org_repo.get_all_admin(status_filter)

    async def _get_user_role_in_org(self, org: Organization, user: User) -> str:
        """Obtém função do usuário em uma organização."""
        logger.warning(
            f"[DEBUG] Checking role for user {user.id} in org {org.id} (owner_id: {org.owner_id})"
        )

        if org.owner_id == user.id:
            return OrgRole.OWNER

        is_organizer = await self._organizer_repo.is_organizer(org.id, user.id)
        logger.warning(f"[DEBUG] Is organizer: {is_organizer}")

        if is_organizer:
            return OrgRole.ORGANIZER

        membership = await self._member_repo.get_membership_by_status(
            org.id, user.id, MemberStatus.ACTIVE
        )
        logger.warning(f"[DEBUG] Membership: {membership}")

        if membership:
            return OrgRole.MEMBER

        return OrgRole.NONE

    async def get_user_role_in_org(self, org: Organization, user: User) -> str:
        """Método público para obter função do usuário em uma organização."""
        return await self._get_user_role_in_org(org, user)

    async def _validate_can_join(
        self, org: Organization, user: User, via_link: bool
    ) -> None:
        """
        Validate if user can join organization.

        Raises:
            UserNotFoundError: Se o usuário não estiver ativo.
            MembershipAlreadyExistsError: Se o usuário já tiver relacionamento.
            JoinPolicyViolationError: Se a política de adesão não permitir a ação.
        """
        if not user.enabled:
            raise UserNotFoundError(str(user.id))

        existing = await self._member_repo.get_membership(org.id, user.id)

        if existing:
            if existing.status == MemberStatus.PENDING:
                raise MembershipAlreadyExistsError(
                    "Você já tem uma solicitação de entrada pendente."
                )
            elif existing.status == MemberStatus.INVITED:
                raise MembershipAlreadyExistsError(
                    "Você já foi convidado para esta organização. Aceite ou recuse o convite."
                )
            elif existing.status == MemberStatus.ACTIVE:
                raise MembershipAlreadyExistsError(
                    "Você já é membro desta organização."
                )
            else:
                raise MembershipAlreadyExistsError()

        if via_link:
            if org.join_policy not in [
                OrganizationJoinPolicy.LINK_ONLY,
                OrganizationJoinPolicy.REQUEST_AND_LINK,
                OrganizationJoinPolicy.INVITE_AND_LINK,
                OrganizationJoinPolicy.ALL,
            ]:
                raise JoinPolicyViolationError(
                    "Entrada via link não é permitida para esta organização."
                )
        else:
            if org.join_policy not in [
                OrganizationJoinPolicy.REQUEST_ONLY,
                OrganizationJoinPolicy.INVITE_AND_REQUEST,
                OrganizationJoinPolicy.REQUEST_AND_LINK,
                OrganizationJoinPolicy.ALL,
            ]:
                raise JoinPolicyViolationError(
                    "Esta organização não aceita solicitações de adesão."
                )
