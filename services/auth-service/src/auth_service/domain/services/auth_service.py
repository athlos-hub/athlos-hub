import datetime
import logging
import uuid
from datetime import timedelta
from typing import Any, Dict, Optional

import boto3
from common.exceptions import AppException
from common.security.jwt_handler import JwtHandler
from database.client import db
from fastapi import Depends, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from keycloak import KeycloakAdmin, KeycloakOpenID
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from upload_s3.main import upload_file

from auth_service.core.config import settings
from auth_service.infrastructure.database.models.user_model import User

logger = logging.getLogger(__name__)

keycloak_openid = KeycloakOpenID(
    server_url=settings.KEYCLOAK_URL,
    client_id=settings.KEYCLOAK_CLIENT_ID,
    realm_name=settings.KEYCLOAK_REALM,
    client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
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
                "-----BEGIN PUBLIC KEY-----\n" f"{key_pem}\n" "-----END PUBLIC KEY-----"
            )
            return AuthService._public_key_cache

        except Exception as e:
            logger.error(f"Erro ao obter chave pública: {e}")
            raise AppException("Erro ao obter chave pública do Keycloak")

    @staticmethod
    def generate_email_token(user_id: str, expiry_hours: int = 24) -> str:
        payload = {
            "sub": user_id,
            "iat": datetime.datetime.now(),
            "exp": datetime.datetime.now() + timedelta(hours=expiry_hours),
        }
        token = jwt.encode(payload, settings.EMAIL_TOKEN_SECRET, algorithm="HS256")
        return token

    @staticmethod
    async def activate_user(user_id: str) -> Dict[str, Any]:
        try:
            async with db.session() as session:
                stmt = select(User).where(User.keycloak_id == user_id)
                result = await session.execute(stmt)
                user = result.scalar_one_or_none()

                if not user:
                    logger.warning(f"Usuário {user_id} não encontrado")
                    return {"success": False, "error": "user_not_found"}

                if user.enabled and user.email_verified:
                    logger.info(f"Usuário {user_id} já estava ativado")
                    return {"success": True, "already_active": True}

                keycloak_admin = KeycloakAdmin(
                    server_url=settings.KEYCLOAK_URL,
                    client_id=settings.KEYCLOAK_CLIENT_ID,
                    client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
                    realm_name=settings.KEYCLOAK_REALM,
                    user_realm_name=settings.KEYCLOAK_REALM,
                    verify=True,
                )

                keycloak_admin.update_user(
                    user_id=user_id, payload={"enabled": True, "emailVerified": True}
                )

                user.enabled = True
                user.email_verified = True

                await session.commit()
                await session.refresh(user)

                logger.info(f"Usuário {user_id} ativado com sucesso")
                return {"success": True, "user_id": user_id, "email": user.email}

        except Exception as e:
            logger.error(f"Erro ao ativar usuário {user_id}: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def get_current_db_user(
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    ) -> User:
        public_key = await AuthService.get_public_key()

        payload = JwtHandler.decode_token(
            token=credentials.credentials,
            public_key=public_key,
            audience=settings.KEYCLOAK_CLIENT_ID,
            issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}",
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
                issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}",
            )

            user = await AuthService.get_or_create_user_from_keycloak_token(payload)
            return user
        except Exception:
            return None

    @staticmethod
    async def get_or_create_user_from_keycloak_token(
        token_payload: Dict[str, Any],
    ) -> User:
        try:
            keycloak_id = token_payload.get("sub")
            if not keycloak_id:
                raise AppException("Token inválido: campo 'sub' não encontrado")

            email = token_payload.get("email")
            username = token_payload.get("preferred_username")
            first_name = token_payload.get("given_name") or ""
            last_name = token_payload.get("family_name") or ""
            email_verified = token_payload.get("email_verified", False)
            avatar_url = token_payload.get("picture")
            enabled_payload = token_payload.get("enabled")

            if enabled_payload is None:
                enabled_payload = email_verified

            now = datetime.datetime.now(datetime.timezone.utc)

            async with db.session() as session:
                stmt = select(User).where(User.keycloak_id == keycloak_id)
                result = await session.execute(stmt)
                user = result.scalar_one_or_none()

                if user:
                    updates = {}

                    updates["last_login_at"] = now

                    if email and user.email != email:
                        updates["email"] = email

                    if username and user.username != username and not user.username:
                        updates["username"] = username

                    if (
                        first_name
                        and user.first_name != first_name
                        and not user.first_name
                    ):
                        updates["first_name"] = first_name

                    if last_name and user.last_name != last_name and not user.last_name:
                        updates["last_name"] = last_name

                    if avatar_url and user.avatar_url != avatar_url:
                        updates["avatar_url"] = avatar_url
                    if user.email_verified != email_verified:
                        updates["email_verified"] = email_verified

                    if enabled_payload is not None and user.enabled != enabled_payload:
                        updates["enabled"] = enabled_payload

                    if updates:
                        for key, value in updates.items():
                            setattr(user, key, value)
                        logger.info(
                            f"Usuário atualizado: {user.email} - campos: {list(updates.keys())}"
                        )
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
                            user_by_email.last_login_at = now

                            if avatar_url:
                                user_by_email.avatar_url = avatar_url

                            if enabled_payload is not None:
                                user_by_email.enabled = enabled_payload

                            logger.info(
                                f"Usuário migrado: {email} -> keycloak_id: {keycloak_id}"
                            )
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
                    enabled=enabled_payload,
                    email_verified=email_verified,
                    last_login_at=now,
                    avatar_url=avatar_url,
                )

                session.add(new_user)

                try:
                    await session.commit()
                    await session.refresh(new_user)
                    logger.info(
                        f"Novo usuário criado: {new_user.email} (keycloak_id: {keycloak_id})"
                    )
                    return new_user

                except IntegrityError as ie:
                    await session.rollback()
                    logger.warning(f"Race condition detectada ao criar usuário: {ie}")

                    stmt_retry = select(User).where(User.keycloak_id == keycloak_id)
                    result_retry = await session.execute(stmt_retry)
                    user_retry = result_retry.scalar_one_or_none()

                    if user_retry:
                        return user_retry

                    raise AppException(
                        "Erro ao criar usuário: IntegrityError persistente"
                    )

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
                verify=True,
            )

            role_object = keycloak_admin.get_realm_role(role_name)

            keycloak_admin.assign_realm_roles(
                user_id=user_id_keycloak, roles=[role_object]
            )

            logger.info(f"Role '{role_name}' adicionada ao usuário {user_id_keycloak}")
            return True

        except Exception as e:
            logger.error(f"Erro ao adicionar role no Keycloak: {e}")
            raise AppException(f"Não foi possível atribuir o perfil {role_name}")

    @staticmethod
    def get_role_from_user(user_id_keycloak: str):
        try:
            keycloak_admin = KeycloakAdmin(
                server_url=settings.KEYCLOAK_URL,
                client_id=settings.KEYCLOAK_CLIENT_ID,
                client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
                realm_name=settings.KEYCLOAK_REALM,
                user_realm_name=settings.KEYCLOAK_REALM,
                verify=True,
            )

            roles = keycloak_admin.get_realm_roles_of_user(user_id_keycloak)
            role_names = [role["name"] for role in roles]

            logger.info(
                f"Roles obtidas para o usuário {user_id_keycloak}: {role_names}"
            )
            return role_names

        except Exception as e:
            logger.error(f"Erro ao obter roles do Keycloak: {e}")
            raise AppException("Não foi possível obter os perfis do usuário")

    @staticmethod
    def upload_avatar(
        file: UploadFile,
        user_id: str,
        aws_access_key_id,
        aws_secret_access_key,
        aws_region,
        aws_bucket,
    ):
        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/jpg",
        }
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Tipo de arquivo não permitido. Use apenas imagens",
            )

        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        if file_size > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400, detail="Arquivo muito grande. Máximo: 5MB"
            )

        s3 = boto3.client(
            "s3",
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=aws_region,
        )

        try:
            response = s3.list_objects_v2(
                Bucket=aws_bucket, Prefix=f"avatars/{user_id}/"
            )
            if "Contents" in response:
                for obj in response["Contents"]:
                    s3.delete_object(Bucket=aws_bucket, Key=obj["Key"])
        except Exception:
            pass

        result = upload_file(
            file,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            aws_region=aws_region,
            aws_bucket=aws_bucket,
        )

        return result
