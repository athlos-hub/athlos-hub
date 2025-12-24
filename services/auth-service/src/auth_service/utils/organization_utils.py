from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth_service.infrastructure.database.models import (
    Organization,
    OrganizationMember,
    User,
)
from auth_service.infrastructure.database.models.enums import (
    MemberStatus,
    OrganizationJoinPolicy,
)


async def can_user_join_organization(
    org: Organization, user: User, session: AsyncSession, via_link: bool = False
) -> None:

    member_is_active = await session.scalar(
        select(User).where(User.id == user.id, User.enabled == True)
    )
    if not member_is_active:
        raise HTTPException(
            status_code=403,
            detail="Sua conta de usuário deve estar ativa para entrar nesta organização.",
        )

    existing_membership = await session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status.in_(
                [MemberStatus.PENDING, MemberStatus.ACTIVE, MemberStatus.INVITED]
            ),
        )
    )
    if existing_membership:
        if existing_membership.status == MemberStatus.PENDING:
            detail = "Você já tem uma solicitação de entrada pendente."
        elif existing_membership.status == MemberStatus.INVITED:
            detail = "Você já foi convidado para esta organização. Aceite ou recuse o convite."
        elif existing_membership.status == MemberStatus.ACTIVE:
            detail = "Você já é membro desta organização."
        else:
            detail = "Você já possui um relacionamento com esta organização."

        raise HTTPException(status_code=409, detail=detail)

    if via_link:
        if org.join_policy not in [
            OrganizationJoinPolicy.LINK_ONLY,
            OrganizationJoinPolicy.REQUEST_AND_LINK,
            OrganizationJoinPolicy.INVITE_AND_LINK,
            OrganizationJoinPolicy.ALL,
        ]:
            raise HTTPException(
                status_code=403,
                detail="Entrada via link não é permitida para esta organização.",
            )
    else:
        if org.join_policy not in [
            OrganizationJoinPolicy.REQUEST_ONLY,
            OrganizationJoinPolicy.INVITE_AND_REQUEST,
            OrganizationJoinPolicy.REQUEST_AND_LINK,
            OrganizationJoinPolicy.ALL,
        ]:
            raise HTTPException(
                status_code=403,
                detail="Esta organização não aceita solicitações de adesão.",
            )
