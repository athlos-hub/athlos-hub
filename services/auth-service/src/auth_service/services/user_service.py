"""Serviço de usuário com lógica de negócio."""

import logging
from typing import Any, Optional, Sequence
from uuid import UUID

from fastapi import UploadFile

from auth_service.core.config import settings
from auth_service.core.exceptions import (
    AvatarUploadError,
    EmailAlreadyInUseError,
    KeycloakCommunicationError,
    UsernameAlreadyInUseError,
    UserNotFoundError,
)
from auth_service.core.ports.keycloak_service import IKeycloakService
from auth_service.infrastructure.database.models.user_model import User
from auth_service.repositories.user_repository import UserRepositoryContract
from auth_service.schemas.user import UserAdmin
from auth_service.services.authentication_service import AuthenticationService
from auth_service.utils.keycloak_identity import build_keycloak_identity_update
from auth_service.utils.upload_image import upload_image

logger = logging.getLogger(__name__)

_AVATAR_URL_MAX_LEN = 255


def _has_real_upload(avatar: Optional[UploadFile]) -> bool:
    if avatar is None:
        return False
    name = getattr(avatar, "filename", None) or ""
    return bool(str(name).strip())


class UserService:
    """Serviço contendo toda lógica de negócio relacionada a usuário."""

    def __init__(
        self,
        user_repository: UserRepositoryContract,
        keycloak_service: Optional[IKeycloakService] = None,
    ):
        self._user_repo = user_repository
        self._keycloak_service = keycloak_service

    async def get_user_by_id(self, user_id: UUID) -> User:
        user = await self._user_repo.get_by_id(user_id)
        if not user or not user.enabled:
            raise UserNotFoundError(str(user_id))
        return user

    async def get_user_by_id_optional(self, user_id: UUID) -> Optional[User]:
        return await self._user_repo.get_by_id(user_id)

    async def get_user_by_email(self, email: str) -> Optional[User]:
        return await self._user_repo.get_by_email(email)

    async def get_user_by_keycloak_id(self, keycloak_id: str) -> Optional[User]:
        return await self._user_repo.get_by_keycloak_id(keycloak_id)

    async def get_user_by_username(self, username: str) -> Optional[User]:
        return await self._user_repo.get_by_username(username)

    async def get_all_enabled_users(self) -> Sequence[User]:
        return await self._user_repo.get_all_enabled()

    async def get_all_users(self) -> Sequence[User]:
        return await self._user_repo.get_all()

    async def get_all_users_with_roles(self) -> Sequence[UserAdmin]:
        users = await self._user_repo.get_all()
        results: list[UserAdmin] = []
        for user in users:
            roles: list[str] = []
            try:
                roles = AuthenticationService.get_role_from_user(user.keycloak_id) or []
            except Exception:
                roles = []

            is_admin_flag = any(role.lower() == "admin" for role in roles)
            user_dict = {
                **{k: getattr(user, k) for k in user.__dict__ if not k.startswith("_")},
                "roles": roles,
                "is_admin": is_admin_flag,
            }
            results.append(UserAdmin.model_validate(user_dict))
        return results

    async def update_user(
        self,
        user_id: UUID,
        data: dict[str, Any],
        check_username: Optional[str] = None,
        existing_username_keycloak_id: Optional[str] = None,
    ) -> User:
        if (
            check_username
            and existing_username_keycloak_id
            and existing_username_keycloak_id != str(user_id)
        ):
            raise UsernameAlreadyInUseError(check_username)

        user = await self._user_repo.update(user_id, data)
        if not user:
            raise UserNotFoundError(str(user_id))

        await self._user_repo.commit()
        logger.info("Usuário %s atualizado: %s", user_id, list(data.keys()))
        return user

    async def create_user(self, user: User) -> User:
        created_user = await self._user_repo.create(user)
        await self._user_repo.commit()
        logger.info("Novo usuário criado: %s", created_user.email)
        return created_user

    async def is_user_active(self, user_id: UUID) -> bool:
        user = await self._user_repo.get_by_id(user_id)
        return bool(user and user.enabled)

    async def update_user_profile(
        self,
        user: User,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        username: Optional[str] = None,
        email: Optional[str] = None,
        avatar: Optional[UploadFile] = None,
    ) -> User:
        if not self._keycloak_service:
            raise KeycloakCommunicationError(
                "Serviço de autenticação indisponível para atualizar perfil"
            )

        db_user = await self._user_repo.get_by_id(user.id)
        if not db_user:
            db_user = await self._user_repo.get_by_keycloak_id(user.keycloak_id)
        if not db_user:
            raise UserNotFoundError(str(user.id))

        updates_keycloak_identity: dict[str, Any] = {}
        updates_db: dict[str, Any] = {}

        if first_name is not None:
            fn = first_name.strip()
            updates_keycloak_identity["firstName"] = fn
            updates_db["first_name"] = fn or None
        if last_name is not None:
            ln = last_name.strip()
            updates_keycloak_identity["lastName"] = ln
            updates_db["last_name"] = ln or None

        if username is not None and username.strip():
            username_exists = await self._keycloak_service.check_username_exists(
                username.strip(), exclude_keycloak_id=user.keycloak_id
            )
            if username_exists:
                raise UsernameAlreadyInUseError(username.strip())
            updates_keycloak_identity["username"] = username.strip()
            updates_db["username"] = username.strip()

        if email is not None:
            em = email.strip()
            if em and em != (db_user.email or ""):
                other = await self._user_repo.get_by_email(em)
                if other and other.id != db_user.id:
                    raise EmailAlreadyInUseError(em)
                kc_with_email = await self._keycloak_service.get_users_by_email(em)
                if any(u.get("id") != user.keycloak_id for u in kc_with_email):
                    raise EmailAlreadyInUseError(em)
                updates_keycloak_identity["email"] = em
                updates_db["email"] = em

        if _has_real_upload(avatar):
            try:
                result = upload_image(
                    avatar,
                    user_id=user.keycloak_id,
                    aws_access_key_id=settings.AWS_BUCKET_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_BUCKET_SECRET_ACCESS_KEY,
                    aws_region=settings.AWS_BUCKET_REGION,
                    aws_bucket=settings.AWS_BUCKET_NAME,
                    prefix="avatars",
                )
            except AvatarUploadError:
                raise
            except Exception as exc:
                logger.exception("Falha no upload de avatar")
                raise AvatarUploadError(
                    "Não foi possível enviar a imagem. Tente novamente."
                ) from exc

            avatar_url = result["url"]
            if len(avatar_url) > _AVATAR_URL_MAX_LEN:
                raise AvatarUploadError(
                    "URL do avatar excede o limite do sistema; use uma imagem com nome mais curto "
                    "ou ajuste o bucket/região."
                )
            updates_db["avatar_url"] = avatar_url

        if updates_keycloak_identity:
            try:
                existing_kc = await self._keycloak_service.get_user(user.keycloak_id)
                kc_payload = build_keycloak_identity_update(
                    existing_kc, updates_keycloak_identity
                )
                await self._keycloak_service.update_user(user.keycloak_id, kc_payload)
            except Exception as exc:
                logger.exception(
                    "Keycloak update_user falhou para subject %s", user.keycloak_id
                )
                raise KeycloakCommunicationError(
                    "Não foi possível sincronizar o perfil com o servidor de autenticação."
                ) from exc

        if updates_db:
            updated_user = await self._user_repo.update(db_user.id, updates_db)
            await self._user_repo.commit()
            if updated_user:
                logger.info(
                    "Usuário %s atualizado: %s",
                    updated_user.id,
                    list(updates_db.keys()),
                )
                return updated_user

        return db_user

    async def suspend_user(self, user_id: UUID) -> None:
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError(str(user_id))
        await self._user_repo.update(user_id, {"enabled": False})
        await self._user_repo.commit()
        logger.info("Usuário %s suspenso", user_id)

    async def unsuspend_user(self, user_id: UUID) -> None:
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError(str(user_id))
        await self._user_repo.update(user_id, {"enabled": True})
        await self._user_repo.commit()
        logger.info("Usuário %s reativado", user_id)

