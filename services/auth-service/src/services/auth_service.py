from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from keycloak import KeycloakOpenID, KeycloakAdmin
from typing import Dict, Any, Optional
from fastapi.concurrency import run_in_threadpool
import logging
import uuid
from common.security.jwt_handler import JwtHandler
from ..config.settings import settings
from common.exceptions import (
    InvalidCredentialsError,
    TokenExpiredError,
    AppException
)
from database.client import db
from ..models.user import User
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

keycloak_openid = KeycloakOpenID(
    server_url=settings.KEYCLOAK_URL,
    client_id=settings.KEYCLOAK_CLIENT_ID,
    realm_name=settings.KEYCLOAK_REALM,
    client_secret_key=settings.KEYCLOAK_CLIENT_SECRET
)

bearer_scheme = HTTPBearer()


class AuthService:
    _public_key_cache = None

    @staticmethod
    async def get_public_key() -> str:
        if AuthService._public_key_cache:
            return AuthService._public_key_cache

        try:
            key_pem = await run_in_threadpool(keycloak_openid.public_key)

            AuthService._public_key_cache = (
                "-----BEGIN PUBLIC KEY-----\n"
                f"{key_pem}\n"
                "-----END PUBLIC KEY-----"
            )
            return AuthService._public_key_cache

        except Exception as e:
            logger.error(f"Erro ao obter chave pública: {e}")
            raise AppException("Erro ao obter chave pública do Keycloak")

    @staticmethod
    async def get_current_db_user(
            credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
    ) -> User:
        public_key = await AuthService.get_public_key()

        payload = JwtHandler.decode_token(
            token=credentials.credentials,
            public_key=public_key,
            audience=settings.KEYCLOAK_CLIENT_ID,
            issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}"
        )

        db_user = await AuthService.get_or_create_user_from_keycloak_token(payload)
        return db_user

    @staticmethod
    async def get_current_user_optional(request: Request) -> Optional[User]:
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        try:
            token = auth_header.split(" ")[1]

            public_key = await AuthService.get_public_key()

            payload = JwtHandler.decode_token(
                token=token,
                public_key=public_key,
                audience=settings.KEYCLOAK_CLIENT_ID,
                issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}"
            )

            user = await AuthService.get_or_create_user_from_keycloak_token(payload)
            return user
        except Exception:
            return None

    @staticmethod
    async def get_or_create_user_from_keycloak_token(token_payload: Dict[str, Any]) -> User:
        try:
            keycloak_id = token_payload.get("sub")
            if not keycloak_id:
                raise AppException("Token inválido: campo 'sub' não encontrado")

            email = token_payload.get("email")
            username = token_payload.get("preferred_username")
            first_name = token_payload.get("given_name") or ""
            last_name = token_payload.get("family_name") or ""
            email_verified = token_payload.get("email_verified", False)

            async with db.session() as session:
                stmt = select(User).where(User.keycloak_id == keycloak_id)
                result = await session.execute(stmt)
                user = result.scalar_one_or_none()

                if user:
                    updates = {}
                    if email and user.email != email:
                        updates['email'] = email
                    if username and user.username != username:
                        updates['username'] = username
                    if first_name and user.first_name != first_name:
                        updates['first_name'] = first_name
                    if last_name and user.last_name != last_name:
                        updates['last_name'] = last_name
                    if user.email_verified != email_verified:
                        updates['email_verified'] = email_verified

                    if updates:
                        for key, value in updates.items():
                            setattr(user, key, value)
                        logger.info(f"Usuário atualizado: {user.email} - campos: {list(updates.keys())}")
                        await session.commit()
                        await session.refresh(user)

                    return user

                if email:
                    stmt_email = select(User).where(User.email == email)
                    result_email = await session.execute(stmt_email)
                    user_by_email = result_email.scalar_one_or_none()

                    if user_by_email:
                        if not user_by_email.keycloak_id:
                            user_by_email.keycloak_id = keycloak_id
                            user_by_email.email_verified = email_verified
                            logger.info(f"Usuário migrado: {email} -> keycloak_id: {keycloak_id}")
                            await session.commit()
                            await session.refresh(user_by_email)
                            return user_by_email

                        if user_by_email.keycloak_id != keycloak_id:
                            logger.error(
                                f"CONFLITO: email {email} já vinculado a keycloak_id "
                                f"{user_by_email.keycloak_id}, tentando vincular {keycloak_id}"
                            )
                            raise AppException(
                                "Conflito de identidade: email já vinculado a outra conta"
                            )

                new_user = User(
                    id=uuid.uuid4(),
                    keycloak_id=keycloak_id,
                    email=email,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    enabled=True,
                    email_verified=email_verified
                )

                session.add(new_user)

                try:
                    await session.commit()
                    await session.refresh(new_user)
                    logger.info(f"Novo usuário criado: {new_user.email} (keycloak_id: {keycloak_id})")
                    return new_user

                except IntegrityError as ie:
                    await session.rollback()
                    logger.warning(f"Race condition detectada ao criar usuário: {ie}")

                    stmt_retry = select(User).where(User.keycloak_id == keycloak_id)
                    result_retry = await session.execute(stmt_retry)
                    user_retry = result_retry.scalar_one_or_none()

                    if user_retry:
                        return user_retry

                    raise AppException("Erro ao criar usuário: IntegrityError persistente")

        except AppException:
            raise
        except Exception as e:
            logger.error(f"Erro ao sincronizar usuário: {e}", exc_info=True)
            raise AppException(f"Erro ao processar usuário: {str(e)}")

    @staticmethod
    def add_role_to_user(user_id_keycloak: str, role_name: str):
        try:
            keycloak_admin = KeycloakAdmin(
                server_url=settings.KEYCLOAK_URL,
                client_id=settings.KEYCLOAK_CLIENT_ID,
                client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
                realm_name=settings.KEYCLOAK_REALM,
                user_realm_name=settings.KEYCLOAK_REALM,
                verify=True
            )

            role_object = keycloak_admin.get_realm_role(role_name)

            keycloak_admin.assign_realm_roles(
                user_id=user_id_keycloak,
                roles=[role_object]
            )

            logger.info(f"Role '{role_name}' adicionada ao usuário {user_id_keycloak}")
            return True

        except Exception as e:
            logger.error(f"Erro ao adicionar role no Keycloak: {e}")
            raise AppException(f"Não foi possível atribuir o perfil {role_name}")