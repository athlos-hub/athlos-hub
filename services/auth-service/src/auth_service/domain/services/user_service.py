"""Serviço de usuário com lógica de negócio."""

import logging
from typing import Any, Optional, Sequence
from uuid import UUID

from fastapi import UploadFile

from auth_service.core.config import settings
from auth_service.core.exceptions import UsernameAlreadyInUseError, UserNotFoundError
from auth_service.domain.interfaces.external_services import IKeycloakService
from auth_service.domain.interfaces.repositories import IUserRepository
from auth_service.infrastructure.database.models.user_model import User
from auth_service.utils.upload_image import upload_image

logger = logging.getLogger(__name__)


class UserService:
    """Serviço contendo toda lógica de negócio relacionada a usuário."""

    def __init__(
        self,
        user_repository: IUserRepository,
        keycloak_service: Optional[IKeycloakService] = None,
    ):
        self._user_repo = user_repository
        self._keycloak_service = keycloak_service

    async def get_user_by_id(self, user_id: UUID) -> User:
        """Obtém usuário por ID."""

        user = await self._user_repo.get_by_id(user_id)

        if not user or not user.enabled:
            raise UserNotFoundError(str(user_id))

        return user

    async def get_user_by_id_optional(self, user_id: UUID) -> Optional[User]:
        """Obtém usuário por ID, retorna None se não encontrado."""

        return await self._user_repo.get_by_id(user_id)

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Obtém usuário por email."""

        return await self._user_repo.get_by_email(email)

    async def get_user_by_keycloak_id(self, keycloak_id: str) -> Optional[User]:
        """Obtém usuário por ID do Keycloak."""

        return await self._user_repo.get_by_keycloak_id(keycloak_id)

    async def get_all_enabled_users(self) -> Sequence[User]:
        """Obtém todos os usuários habilitados (listagem pública)."""

        return await self._user_repo.get_all_enabled()

    async def get_all_users(self) -> Sequence[User]:
        """Obtém todos os usuários (admin)."""

        return await self._user_repo.get_all()

    async def update_user(
        self,
        user_id: UUID,
        data: dict[str, Any],
        check_username: Optional[str] = None,
        existing_username_keycloak_id: Optional[str] = None,
    ) -> User:
        """Atualiza informações do usuário."""

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
        logger.info(f"Usuário {user_id} atualizado: {list(data.keys())}")

        return user

    async def create_user(self, user: User) -> User:
        """Cria um novo usuário."""

        created_user = await self._user_repo.create(user)
        await self._user_repo.commit()
        logger.info(f"Novo usuário criado: {created_user.email}")
        return created_user

    async def suspend_user(self, user_id: UUID) -> None:
        """Suspende um usuário por ID."""

        try:
            user = await self._user_repo.suspend(user_id)
            if user is None:
                raise UserNotFoundError(str(user_id))

            await self._user_repo.commit()

        except Exception:
            await self._user_repo.rollback()
            raise

    async def is_user_active(self, user_id: UUID) -> bool:
        """Verifica se o usuário está ativo."""

        user = await self._user_repo.get_by_id(user_id)
        return bool(user and user.enabled)

    async def update_user_profile(
        self,
        user: User,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        username: Optional[str] = None,
        avatar: Optional[UploadFile] = None,
    ) -> User:
        """Atualiza perfil do usuário no Keycloak e banco de dados local."""

        if not self._keycloak_service:
            raise ValueError("KeycloakService é necessário para atualizações de perfil")

        db_user = await self._user_repo.get_by_id(user.id)
        if not db_user:
            db_user = await self._user_repo.get_by_keycloak_id(user.keycloak_id)

        if not db_user:
            raise UserNotFoundError(str(user.id))

        updates_keycloak: dict[str, Any] = {}
        updates_db: dict[str, Any] = {}

        if first_name is not None:
            updates_keycloak["firstName"] = first_name
            updates_db["first_name"] = first_name

        if last_name is not None:
            updates_keycloak["lastName"] = last_name
            updates_db["last_name"] = last_name

        if username is not None and username.strip():
            username_exists = await self._keycloak_service.check_username_exists(
                username, exclude_keycloak_id=user.keycloak_id
            )
            if username_exists:
                raise UsernameAlreadyInUseError(username)

            updates_keycloak["username"] = username
            updates_db["username"] = username

        if avatar:
            result = upload_image(
                avatar,
                user_id=user.keycloak_id,
                aws_access_key_id=settings.AWS_BUCKET_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_BUCKET_SECRET_ACCESS_KEY,
                aws_region=settings.AWS_BUCKET_REGION,
                aws_bucket=settings.AWS_BUCKET_NAME,
                prefix="avatars",
            )

            avatar_url = result["url"]
            updates_db["avatar_url"] = avatar_url
            if "attributes" not in updates_keycloak:
                updates_keycloak["attributes"] = {}
            updates_keycloak["attributes"]["avatar_url"] = avatar_url

        if updates_keycloak:
            await self._keycloak_service.update_user(user.keycloak_id, updates_keycloak)

        if updates_db:
            updated_user = await self._user_repo.update(db_user.id, updates_db)
            await self._user_repo.commit()
            if updated_user:
                logger.info(
                    f"Usuário {updated_user.id} atualizado: {list(updates_db.keys())}"
                )
                return updated_user

        return db_user
