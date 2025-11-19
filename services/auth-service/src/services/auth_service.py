from fastapi.security import HTTPBearer
from keycloak import KeycloakOpenID
from ..config.settings import settings
from fastapi.concurrency import run_in_threadpool
import logging

from common.exceptions import (
    InvalidCredentialsError,
    TokenExpiredError,
    AppException
)
from database.client import db

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