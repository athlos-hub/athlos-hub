"""Serviço de autenticação."""

import datetime
import logging
import uuid
from datetime import timedelta
from typing import Any, Optional
from urllib.parse import urlencode

from auth_service.common.exceptions import AppException
from auth_service.common.exceptions import InvalidCredentialsError as CommonInvalidCredentialsError
from auth_service.common.exceptions import TokenExpiredError as CommonTokenExpiredError
from auth_service.common.security.jwt_handler import JwtHandler
from fastapi import UploadFile
from fastapi.concurrency import run_in_threadpool
from jose import jwt
from keycloak import KeycloakAdmin, KeycloakOpenID, KeycloakOpenIDConnection
from keycloak.exceptions import KeycloakAuthenticationError, KeycloakPostError
from slugify import slugify
from sqlalchemy.exc import IntegrityError

from auth_service.core.config import settings
from auth_service.core.exceptions import (
    AvatarUploadError,
    EmailAlreadyInUseError,
    EmailAlreadyVerifiedError,
    InvalidCallbackError,
    InvalidCredentialsError,
    InvalidTokenError,
    KeycloakCommunicationError,
    RefreshTokenError,
    RegistrationError,
    TokenExpiredError,
    UserActivationError,
    UserDisabledError,
    UsernameAlreadyInUseError,
    UserNotActivatedError,
    UserNotFoundError,
)
from auth_service.core.keycloak_provider import get_keycloak_admin_client
from auth_service.infrastructure.social_profile_publisher import (
    publish_profile_athlete_ensure,
)
from auth_service.infrastructure.database.models.user_model import User
from auth_service.repositories.user_repository import UserRepositoryContract
from auth_service.schemas.auth import KeycloakTokenResponse, TokenResponse
from auth_service.utils.upload_image import upload_image

logger = logging.getLogger(__name__)

keycloak_openid = KeycloakOpenID(
    server_url=settings.KEYCLOAK_URL,
    client_id=settings.KEYCLOAK_CLIENT_ID,
    realm_name=settings.KEYCLOAK_REALM,
    client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
)


class AuthenticationService:
    """Serviço para operações de autenticação."""

    def __init__(self, user_repository: UserRepositoryContract):
        self._user_repo = user_repository

    @staticmethod
    def generate_reset_password_token(user_id: str, expiry_hours: int = 2) -> str:
        payload = {
            "sub": user_id,
            "iat": datetime.datetime.utcnow(),
            "exp": datetime.datetime.utcnow() + timedelta(hours=expiry_hours),
            "type": "reset_password",
        }
        return jwt.encode(payload, settings.EMAIL_TOKEN_SECRET, algorithm="HS256")

    @staticmethod
    def decode_reset_password_token(token: str) -> dict[str, Any]:
        try:
            payload = JwtHandler.decode_email_token(
                token=token,
                secret_key=settings.EMAIL_TOKEN_SECRET,
            )
            if payload.get("type") != "reset_password":
                raise InvalidTokenError("Tipo de token inválido para reset de senha.")
            return payload
        except CommonTokenExpiredError:
            raise TokenExpiredError()
        except Exception as exc:
            raise InvalidTokenError(str(exc))

    async def get_user_info_for_password_reset(self, email: str) -> dict[str, Any]:
        user = await self._user_repo.get_by_email(email)
        if not user:
            logger.warning("Tentativa de reset para email não encontrado: %s", email)
            raise UserNotFoundError(email)
        return {
            "user_id": str(user.keycloak_id),
            "email": str(user.email),
            "name": user.first_name or user.username,
        }

    async def reset_user_password(self, user_id: str, new_password: str) -> None:
        try:
            keycloak_admin = get_keycloak_admin_client()
            await run_in_threadpool(
                keycloak_admin.set_user_password, user_id, new_password, False
            )
            logger.info("Senha redefinida para usuário %s", user_id)
        except Exception as exc:
            logger.error("Erro ao redefinir senha para usuário %s: %s", user_id, exc)
            raise AppException("Erro ao redefinir senha. Tente novamente.")

    async def _claims_for_user_sync(self, access_token: str) -> dict[str, Any]:
        """
        Claims para get_or_create_user_from_keycloak_token: JWT sem verificação de assinatura
        ou, se faltar `sub` (access tokens minimalistas), merge com userinfo do Keycloak.
        """
        claims = JwtHandler.parse_keycloak_access_token_claims(access_token)
        if claims.get("sub"):
            return claims
        try:
            userinfo = await run_in_threadpool(keycloak_openid.userinfo, access_token)
            if isinstance(userinfo, dict):
                return {**claims, **userinfo}
        except Exception as exc:
            logger.warning(
                "Falha ao obter userinfo do Keycloak (access_token sem sub): %s", exc
            )
        return claims

    @staticmethod
    def generate_email_token(user_id: str, expiry_hours: int = 24) -> str:
        payload = {
            "sub": user_id,
            "iat": datetime.datetime.now(),
            "exp": datetime.datetime.now() + timedelta(hours=expiry_hours),
        }
        return jwt.encode(payload, settings.EMAIL_TOKEN_SECRET, algorithm="HS256")

    @staticmethod
    def decode_email_token(token: str) -> dict[str, Any]:
        try:
            payload = JwtHandler.decode_email_token(
                token=token,
                secret_key=settings.EMAIL_TOKEN_SECRET,
            )
            user_id = payload.get("sub")
            if not isinstance(user_id, str):
                raise InvalidTokenError()
            return payload
        except CommonTokenExpiredError:
            raise TokenExpiredError()
        except CommonInvalidCredentialsError as exc:
            raise InvalidTokenError(str(exc))

    async def handle_keycloak_callback(self, code: str, redirect_uri: str) -> dict[str, Any]:
        if not code or not redirect_uri:
            raise InvalidCallbackError()
        try:
            token_response = await run_in_threadpool(
                keycloak_openid.token,
                code=code,
                redirect_uri=redirect_uri,
                grant_type="authorization_code",
            )
            access_token = token_response.get("access_token")
            refresh_token = token_response.get("refresh_token")
            if not access_token:
                logger.error("Resposta inválida do Keycloak: %s", token_response)
                raise KeycloakCommunicationError(
                    "Falha ao trocar code por token no Keycloak"
                )

            token_payload = await self._claims_for_user_sync(access_token)
            db_user = await self.get_or_create_user_from_keycloak_token(token_payload)

            try:
                await run_in_threadpool(self.add_role_to_user, db_user.keycloak_id, "player")
            except Exception as role_error:
                logger.warning(
                    "Usuário %s criado, mas falha ao atribuir role 'player': %s",
                    db_user.username,
                    role_error,
                )

            user_data = {
                "id": str(db_user.id),
                "username": db_user.username,
                "email": db_user.email,
                "first_name": db_user.first_name or "",
                "last_name": db_user.last_name or "",
                "avatar_url": db_user.avatar_url or "",
                "enabled": bool(db_user.enabled),
                "email_verified": bool(db_user.email_verified),
                "last_login_at": db_user.last_login_at,
            }
            logger.info("Callback Keycloak bem-sucedido para usuário %s", db_user.username)
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user": user_data,
            }
        except (InvalidCallbackError, KeycloakCommunicationError):
            raise
        except Exception as exc:
            logger.error("Erro no callback Keycloak: %s", exc, exc_info=True)
            raise KeycloakCommunicationError("Erro ao processar callback do Keycloak")

    async def login(self, email: str, password: str) -> TokenResponse:
        try:
            raw_token_response = await run_in_threadpool(
                keycloak_openid.token,
                username=email,
                password=password,
                grant_type="password",
            )
            if "error" in raw_token_response:
                raise InvalidCredentialsError()
            try:
                token_response = KeycloakTokenResponse.model_validate(raw_token_response)
            except Exception:
                logger.error("Resposta inválida do Keycloak: %s", raw_token_response)
                raise KeycloakCommunicationError(
                    "Resposta inválida do servidor de autenticação"
                )

            token_payload = await self._claims_for_user_sync(token_response.access_token)
            await self.get_or_create_user_from_keycloak_token(token_payload)
            logger.info("Login bem-sucedido para usuário: %s", email)
            return TokenResponse(
                access_token=token_response.access_token,
                refresh_token=token_response.refresh_token,
                expires_in=token_response.expires_in,
            )
        except (KeycloakPostError, KeycloakAuthenticationError) as exc:
            self._handle_keycloak_auth_error(exc)
            raise InvalidCredentialsError()
        except (InvalidCredentialsError, UserNotActivatedError, UserDisabledError):
            raise
        except KeycloakCommunicationError:
            raise
        except Exception as exc:
            logger.error("Erro interno no login: %s", exc, exc_info=True)
            raise KeycloakCommunicationError("Erro interno no login")

    def _handle_keycloak_auth_error(self, exc: KeycloakPostError | KeycloakAuthenticationError) -> None:
        description = ""
        try:
            if hasattr(exc, "response_body") and exc.response_body:
                try:
                    import json

                    error_body = json.loads(exc.response_body)
                    description = error_body.get("error_description", "")
                except (ValueError, TypeError):
                    description = str(exc)
            else:
                description = str(exc)
        except Exception:
            description = str(exc)

        if "Account is not fully set up" in description:
            raise UserNotActivatedError()
        if "Account disabled" in description:
            raise UserDisabledError()
        if "Invalid user credentials" in description or "invalid_grant" in description:
            raise InvalidCredentialsError()

        logger.error("Erro desconhecido no login: %s", exc)
        raise InvalidCredentialsError()

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        try:
            raw_token_response = await run_in_threadpool(
                keycloak_openid.refresh_token,
                refresh_token=refresh_token,
            )
            try:
                token_response = KeycloakTokenResponse.model_validate(raw_token_response)
            except Exception:
                logger.error(
                    "Resposta inválida do Keycloak no refresh: %s", raw_token_response
                )
                raise KeycloakCommunicationError("Falha ao renovar token no Keycloak")
            return TokenResponse(
                access_token=token_response.access_token,
                refresh_token=token_response.refresh_token,
                expires_in=token_response.expires_in,
            )
        except KeycloakCommunicationError:
            raise
        except Exception as exc:
            logger.error("Erro inesperado ao renovar token: %s", exc, exc_info=True)
            raise RefreshTokenError()

    async def logout(self, refresh_token: str) -> dict[str, str]:
        try:
            await run_in_threadpool(keycloak_openid.logout, refresh_token=refresh_token)
            return {"message": "Logout realizado com sucesso"}
        except KeycloakPostError as exc:
            if exc.response_code == 400:
                return {"message": "Logout realizado (Sessão já estava inativa)"}
            logger.error("Erro crítico no logout Keycloak: %s", exc, exc_info=True)
            raise KeycloakCommunicationError("Erro interno ao processar logout")
        except Exception as exc:
            logger.error("Erro de conexão no logout: %s", exc, exc_info=True)
            raise KeycloakCommunicationError(
                "Falha de comunicação com servidor de autenticação"
            )

    async def register_user(
        self,
        email: str,
        username: str,
        first_name: str,
        last_name: str,
        password: str,
        avatar: Optional[UploadFile] = None,
    ) -> dict[str, Any]:
        try:
            logger.info("Dados recebidos: email=%s, username=%s, first_name=%s, last_name=%s", 
                email, username, first_name, last_name)
            
            email = (email or "").strip()
            username = (username or "").strip()
            first_name = (first_name or "").strip()
            last_name = (last_name or "").strip()
            password = password or ""

            if not email:
                raise RegistrationError("Email é obrigatório")
            if not username:
                raise RegistrationError("Username é obrigatório")
            if not first_name:
                raise RegistrationError("Nome é obrigatório")
            if not password:
                raise RegistrationError("Senha é obrigatória")

            keycloak_admin = get_keycloak_admin_client()
            users_email = await run_in_threadpool(
                keycloak_admin.get_users, query={"email": email, "exact": True}
            )
            if users_email:
                raise EmailAlreadyInUseError(email)

            users_username = await run_in_threadpool(
                keycloak_admin.get_users, query={"username": username, "exact": True}
            )
            if users_username:
                raise UsernameAlreadyInUseError(username)

            keycloak_payload = {
                "email": email,
                "username": username,
                "firstName": first_name,
                "lastName": last_name,
                "enabled": False,
                "credentials": [
                    {"value": password, "type": "password", "temporary": False}
                ],
            }

            logger.info("Payload Keycloak: %s", keycloak_payload)

            new_user_id = await run_in_threadpool(keycloak_admin.create_user, keycloak_payload)

            logger.info("Usuário criado com ID: %s", new_user_id)

            user_check = await run_in_threadpool(keycloak_admin.get_user, new_user_id)
            logger.info("Usuário no Keycloak após criação: %s", user_check)

            # Em algumas configurações do Keycloak federado, garantir update explícito
            # evita perda de campos básicos após criação.
            await run_in_threadpool(
                keycloak_admin.update_user,
                new_user_id,
                {
                    "email": email,
                    "username": username,
                    "firstName": first_name,
                    "lastName": last_name,
                },
            )

            avatar_url = None
            if avatar:
                try:
                    result = upload_image(
                        avatar,
                        user_id=new_user_id,
                        aws_access_key_id=settings.AWS_BUCKET_ACCESS_KEY_ID,
                        aws_secret_access_key=settings.AWS_BUCKET_SECRET_ACCESS_KEY,
                        aws_region=settings.AWS_BUCKET_REGION,
                        aws_bucket=settings.AWS_BUCKET_NAME,
                        prefix="avatars",
                    )
                    avatar_url = result["url"]
                    await run_in_threadpool(
                        keycloak_admin.update_user,
                        new_user_id,
                        {
                            "email": email,
                            "firstName": first_name,
                            "lastName": last_name,
                            "attributes": {"avatar_url": [avatar_url]},
                        },
                    )
                except Exception as exc:
                    logger.warning("Erro no upload do avatar: %s", exc)

            try:
                await run_in_threadpool(self.add_role_to_user, new_user_id, "player")
            except Exception as exc:
                logger.warning("Erro ao atribuir role 'player': %s", exc)

            try:
                await self.get_or_create_user_from_keycloak_token(
                    {
                        "sub": new_user_id,
                        "email": email,
                        "preferred_username": username,
                        "given_name": first_name,
                        "family_name": last_name,
                        "enabled": False,
                        "email_verified": False,
                        "picture": avatar_url,
                    }
                )
            except Exception as exc:
                logger.error("Erro ao salvar no banco local: %s", exc, exc_info=True)
                raise RegistrationError("Falha ao sincronizar dados locais")

            logger.info("Usuário registrado com sucesso: %s (ID: %s)", username, new_user_id)
            return {
                "message": "Usuário criado com sucesso",
                "id": new_user_id,
                "avatar_url": avatar_url,
            }
        except (EmailAlreadyInUseError, UsernameAlreadyInUseError, RegistrationError):
            raise
        except Exception as exc:
            logger.error("Erro crítico no registro: %s", exc, exc_info=True)
            raise RegistrationError()

    async def activate_user(self, user_id: str) -> dict[str, Any]:
        try:
            user = await self._user_repo.get_by_keycloak_id(user_id)
            if not user:
                raise UserNotFoundError(user_id)
            if user.enabled and user.email_verified:
                return {"success": True, "already_active": True, "email": user.email}

            keycloak_admin = get_keycloak_admin_client()
            keycloak_admin.update_user(
                user_id=user_id,
                payload={"enabled": True, "emailVerified": True},
            )
            user.enabled = True
            user.email_verified = True
            await self._user_repo.commit()
            return {"success": True, "user_id": user_id, "email": user.email}
        except UserNotFoundError:
            raise
        except Exception as exc:
            logger.error("Erro ao ativar usuário %s: %s", user_id, exc)
            raise UserActivationError(str(exc))

    async def resend_verification_email(self, email: str) -> dict[str, Any]:
        user = await self._user_repo.get_by_email(email)
        if not user:
            raise UserNotFoundError(email)
        if user.email_verified:
            raise EmailAlreadyVerifiedError()
        return {
            "user_id": str(user.keycloak_id),
            "email": str(user.email),
            "name": user.first_name or user.username,
        }

    @staticmethod
    def keycloak_admin_rep_to_token_payload(rep: dict[str, Any]) -> dict[str, Any]:
        """UserRepresentation do Admin API → claims usados em get_or_create_user_from_keycloak_token."""
        attrs = rep.get("attributes") or {}
        avatar_val = attrs.get("avatar_url")
        if isinstance(avatar_val, list) and avatar_val:
            picture = avatar_val[0]
        elif isinstance(avatar_val, str):
            picture = avatar_val
        else:
            picture = None
        return {
            "sub": rep.get("id"),
            "email": rep.get("email"),
            "preferred_username": rep.get("username"),
            "given_name": rep.get("firstName") or "",
            "family_name": rep.get("lastName") or "",
            "email_verified": bool(rep.get("emailVerified", False)),
            "enabled": rep.get("enabled", True),
            "picture": picture,
        }

    async def sync_local_user_from_keycloak_admin_rep(self, rep: dict[str, Any]) -> User:
        payload = self.keycloak_admin_rep_to_token_payload(rep)
        return await self.get_or_create_user_from_keycloak_token(payload)

    async def get_or_create_user_from_keycloak_token(self, token_payload: dict[str, Any]) -> User:
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

        user = await self._user_repo.get_by_keycloak_id(keycloak_id)
        if user:
            return await self._update_existing_user(
                user,
                email,
                username,
                first_name,
                last_name,
                email_verified,
                avatar_url,
                enabled_payload,
                now,
            )
        if email:
            user_by_email = await self._user_repo.get_by_email(email)
            if user_by_email:
                return await self._link_existing_user(
                    user_by_email,
                    keycloak_id,
                    email_verified,
                    avatar_url,
                    enabled_payload,
                    now,
                )
        return await self._create_new_user(
            keycloak_id,
            email,
            username,
            first_name,
            last_name,
            email_verified,
            avatar_url,
            enabled_payload,
            now,
        )

    async def _update_existing_user(
        self,
        user: User,
        email: Optional[str],
        username: Optional[str],
        first_name: str,
        last_name: str,
        email_verified: bool,
        avatar_url: Optional[str],
        enabled_payload: bool,
        now: datetime.datetime,
    ) -> User:
        updates: dict[str, Any] = {"last_login_at": now}
        if email and user.email != email:
            updates["email"] = email
        if username and user.username != username and not user.username:
            updates["username"] = username
        if first_name and user.first_name != first_name and not user.first_name:
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
            await self._user_repo.commit()
        return user

    async def _link_existing_user(
        self,
        user: User,
        keycloak_id: str,
        email_verified: bool,
        avatar_url: Optional[str],
        enabled_payload: bool,
        now: datetime.datetime,
    ) -> User:
        if not user.keycloak_id or user.keycloak_id != keycloak_id:
            # Permite login por múltiplos provedores (senha/google) para o mesmo email.
            # Reassocia o usuário local ao `sub` atual recebido do Keycloak.
            user.keycloak_id = keycloak_id
            user.last_login_at = now
            user.email_verified = email_verified
            if avatar_url:
                user.avatar_url = avatar_url
            if enabled_payload is not None:
                user.enabled = enabled_payload
            await self._user_repo.commit()
            return user
        return user

    @staticmethod
    def _normalize_username(
        username: Optional[str],
        email: Optional[str],
        first_name: str,
        last_name: str,
        keycloak_id: str,
    ) -> str:
        """
        Normaliza o username com a seguinte prioridade:
        1. Username fornecido (se não for um email)
        2. Nome + Sobrenome
        3. Parte antes do @ do email (sem incluir o domínio)
        4. Fallback com keycloak_id
        """
        # Se tem username e não é um email, use diretamente
        if username and "@" not in username:
            normalized = slugify(username, lowercase=True)
            if normalized:
                return normalized
        
        # Se tem nome + sobrenome, use
        full_name = f"{first_name or ''} {last_name or ''}".strip()
        if full_name:
            normalized = slugify(full_name, lowercase=True)
            if normalized:
                return normalized
        
        # Se tem email, extraia apenas a parte antes do @
        if email:
            email_part = email.split("@")[0]
            normalized = slugify(email_part, lowercase=True)
            if normalized:
                return normalized
        
        # Fallback: use keycloak_id
        return slugify(f"user-{keycloak_id[:8]}", lowercase=True)

    async def _create_new_user(
        self,
        keycloak_id: str,
        email: Optional[str],
        username: Optional[str],
        first_name: str,
        last_name: str,
        email_verified: bool,
        avatar_url: Optional[str],
        enabled_payload: bool,
        now: datetime.datetime,
    ) -> User:
        normalized_username = self._normalize_username(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            keycloak_id=keycloak_id,
        )

        # Validar se username já existe; se sim, adicionar sufixo
        existing_user = await self._user_repo.get_by_username(normalized_username)
        if existing_user:
            # Adicionar sufixo único baseado em keycloak_id
            normalized_username = f"{normalized_username}-{keycloak_id[:6]}"

        new_user = User(
            id=uuid.uuid4(),
            keycloak_id=keycloak_id,
            email=email,
            username=normalized_username,
            first_name=first_name,
            last_name=last_name,
            enabled=enabled_payload,
            email_verified=email_verified,
            last_login_at=now,
            avatar_url=avatar_url,
        )
        try:
            await self._user_repo.create(new_user)
            await self._user_repo.commit()
            await publish_profile_athlete_ensure(keycloak_id)
            return new_user
        except IntegrityError as exc:
            await self._user_repo.rollback()
            logger.warning("Race condition detectada ao criar usuário: %s", exc)
            user_retry = await self._user_repo.get_by_keycloak_id(keycloak_id)
            if user_retry:
                return user_retry
            raise AppException("Erro ao criar usuário: IntegrityError persistente")

    @staticmethod
    def add_role_to_user(user_id_keycloak: str, role_name: str) -> bool:
        try:
            keycloak_admin = get_keycloak_admin_client()
            role_object = keycloak_admin.get_realm_role(role_name)
            keycloak_admin.assign_realm_roles(user_id=user_id_keycloak, roles=[role_object])
            return True
        except Exception as exc:
            logger.error("Erro ao adicionar role no Keycloak: %s", exc)
            raise AppException(f"Não foi possível atribuir o perfil {role_name}")

    @staticmethod
    def get_role_from_user(user_id_keycloak: str) -> list[str]:
        try:
            keycloak_admin = get_keycloak_admin_client()
            roles = keycloak_admin.get_realm_roles_of_user(user_id_keycloak)
            return [role["name"] for role in roles]
        except Exception as exc:
            logger.error("Erro ao obter roles do Keycloak: %s", exc)
            raise AppException("Não foi possível obter os perfis do usuário")

    @staticmethod
    def get_google_auth_url() -> str:
        keycloak_base = settings.KEYCLOAK_ISSUER.rstrip("/")
        realm = settings.KEYCLOAK_REALM
        base_url = f"{keycloak_base}/realms/{realm}/protocol/openid-connect/auth"
        params = {
            "client_id": settings.KEYCLOAK_CLIENT_ID,
            "redirect_uri": f"{settings.FRONTEND_URL}/auth/callback",
            "response_type": "code",
            "scope": "openid email profile",
            "kc_idp_hint": "google",
        }
        return f"{base_url}?{urlencode(params)}"

