from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from keycloak import KeycloakOpenID
from ..config.settings import settings
from typing import Dict, Any, Optional
from fastapi.concurrency import run_in_threadpool
import logging
import uuid

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
    async def decode_token(token: str) -> Dict[str, Any]:
        try:
            public_key = await AuthService.get_public_key()

            options = {
                "verify_signature": True,
                "verify_aud": True,
                "verify_exp": True,
                "verify_iss": True,
            }

            payload = jwt.decode(
                token,
                public_key,
                algorithms=[settings.ALGORITHM],
                options=options,
                audience=settings.KEYCLOAK_CLIENT_ID,
                issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}"
            )

            required_claims = ['sub', 'exp', 'iat']
            missing = [c for c in required_claims if c not in payload]
            if missing:
                raise InvalidCredentialsError(f"Claims faltando: {missing}")

            return payload

        except JWTError as e:
            logger.warning(f"Token inválido: {str(e)}")
            err_msg = str(e).lower()
            if "exp" in err_msg or "expired" in err_msg:
                raise TokenExpiredError()
            if "iss" in err_msg or "issuer" in err_msg:
                raise InvalidCredentialsError("Token de origem inválida")
            raise InvalidCredentialsError()

    @staticmethod
    async def get_current_db_user(
            credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
    ) -> User:
        payload = await AuthService.decode_token(credentials.credentials)
        db_user = await AuthService.get_or_create_user_from_keycloak_token(payload)
        return db_user

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