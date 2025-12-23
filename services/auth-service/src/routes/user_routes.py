from fastapi import APIRouter, status, Depends, HTTPException, File, UploadFile, Form
from uuid import UUID
from sqlalchemy import select, update as sa_update
from ..models.user import User
from ..schemas.user import UserPublic
from ..core.exceptions import OrganizationNotFoundError, UserNotFoundError
from database.dependencies import get_session
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from slugify import slugify
from ..models.organization import Organization, OrganizationMember, OrganizationOrganizer
from ..services.auth_service import AuthService
from ..models.enums import MemberStatus
from ..config.settings import settings
from keycloak import KeycloakAdmin
from fastapi.concurrency import run_in_threadpool
from typing import Optional


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/{user_id}", response_model=UserPublic)
async def get_user_by_id(user_id: UUID,
                         session: AsyncSession = Depends(get_session)):

    user = await session.get(User, user_id)

    if not user or not user.enabled:
        raise UserNotFoundError(str(user_id))

    return user


@router.put("/me", response_model=UserPublic)
async def update_user_info(user: User = Depends(AuthService.get_current_db_user),
                           session: AsyncSession = Depends(get_session),
                           first_name: Optional[str] = Form(None),
                           last_name: Optional[str] = Form(None),
                           username: Optional[str] = Form(None),
                           avatar: Optional[UploadFile] = File(None)):

    try:
        keycloak_admin = KeycloakAdmin(
            server_url=settings.KEYCLOAK_URL,
            client_id=settings.KEYCLOAK_CLIENT_ID,
            client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
            realm_name=settings.KEYCLOAK_REALM,
            user_realm_name=settings.KEYCLOAK_REALM,
            verify=True
        )

        db_user = await session.get(User, user.id)
        if not db_user:
            stmt = select(User).where(User.keycloak_id == user.keycloak_id)
            db_user = await session.scalar(stmt)

        if not db_user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado na sessão do banco")

        updates_keycloak = {}
        updates_db = {}

        if first_name is not None:
            updates_keycloak['firstName'] = first_name
            updates_db['first_name'] = first_name

        if last_name is not None:
            updates_keycloak['lastName'] = last_name
            updates_db['last_name'] = last_name

        if username is not None and username.strip():
            users_username = await run_in_threadpool(
                keycloak_admin.get_users, query={"username": username, "exact": True}
            )
            if users_username and users_username[0].get('id') != user.keycloak_id:
                raise HTTPException(
                    status_code=400,
                    detail="Nome de usuário já está em uso"
                )
            updates_keycloak['username'] = username
            updates_db['username'] = username

        avatar_url = None
        if avatar:
            try:
                result = AuthService.upload_avatar(
                    avatar,
                    user_id=user.keycloak_id,
                    aws_access_key_id=settings.AWS_BUCKET_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_BUCKET_SECRET_ACCESS_KEY,
                    aws_region=settings.AWS_BUCKET_REGION,
                    aws_bucket=settings.AWS_BUCKET_NAME
                )
                avatar_url = result["url"]
                updates_db['avatar_url'] = avatar_url

                if not updates_keycloak.get('attributes'):
                    updates_keycloak['attributes'] = {}
                updates_keycloak['attributes']['avatar_url'] = avatar_url

            except HTTPException as e:
                logger.warning(f"Erro no upload do avatar para usuário {user.id}: {e.detail}")
                raise

        if updates_keycloak:
            await run_in_threadpool(
                keycloak_admin.update_user,
                user.keycloak_id,
                updates_keycloak
            )
            logger.info(f"Usuário {user.keycloak_id} atualizado no Keycloak: {list(updates_keycloak.keys())}")

        if updates_db:
            stmt_update = sa_update(User).where(User.id == db_user.id).values(**updates_db)
            await session.execute(stmt_update)
            await session.commit()

            logger.info(f"Usuário {db_user.id} atualizado no banco de dados: {list(updates_db.keys())}")

        stmt_final = select(User).where(User.id == db_user.id)
        refreshed_user = await session.scalar(stmt_final)

        if refreshed_user:
            await session.refresh(refreshed_user)
            logger.debug(f"Dados finais do usuário: first_name={refreshed_user.first_name!r}, last_name={refreshed_user.last_name!r}, username={refreshed_user.username!r}")
            return refreshed_user

        return db_user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar usuário: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao atualizar informações do usuário"
        )


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


@router.delete("/organizations/{org_slug}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_organization(org_slug: str,
                             user: User = Depends(AuthService.get_current_db_user),
                             session: AsyncSession = Depends(get_session)):

    org_stmt = select(Organization).where(Organization.slug == org_slug)

    org = await session.scalar(org_stmt)

    if not org:
        raise OrganizationNotFoundError(org_slug)

    if org.owner_id == user.id:
        raise HTTPException(
            status_code=403,
            detail="O proprietário da organização não pode sair da organização. "
                   "Transfira a propriedade ou exclua a organização."
        )

    organizer_stmt = (
        select(OrganizationOrganizer)
        .where(
            OrganizationOrganizer.organization_id == org.id,
            OrganizationOrganizer.user_id == user.id
        )
    )

    organizer = await session.scalar(organizer_stmt)

    if organizer:
        await session.delete(organizer)

    membership_stmt = (
        select(OrganizationMember)
        .where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MemberStatus.ACTIVE,
        )
    )

    membership = await session.scalar(membership_stmt)

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Você não é um membro ativo desta organização."
        )

    await session.delete(membership)
    await session.commit()

    logger.info(f"Usuário {user.id} saiu da organização {org_slug}")
    return