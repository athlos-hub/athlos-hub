import logging
from typing import Any, Dict

from jose import JWTError, jwt

from auth_service.common.exceptions import InvalidCredentialsError, TokenExpiredError

logger = logging.getLogger(__name__)


class JwtHandler:
    @staticmethod
    def parse_keycloak_access_token_claims(token: str) -> Dict[str, Any]:
        """
        Extrai claims do access_token devolvido pelo Keycloak sem verificar assinatura RS256.

        Validação JWT em chamadas à API fica no Kong. Aqui o token foi obtido há instantes
        do token endpoint (password / authorization_code); só precisamos de claims para
        sincronizar o utilizador local.
        """
        if not token or not isinstance(token, str):
            raise InvalidCredentialsError("Token de acesso ausente ou inválido")
        try:
            raw = jwt.get_unverified_claims(token)
            return dict(raw) if isinstance(raw, dict) else {}
        except JWTError as e:
            logger.debug("Access token não é JWT ou está malformado: %s", e)
            return {}

    @staticmethod
    def decode_email_token(
        token: str,
        secret_key: str,
        algorithm: str = "HS256",
    ) -> Dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                secret_key,
                algorithms=[algorithm],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                },
            )

            required_claims = ["sub", "exp", "iat"]
            missing = [c for c in required_claims if c not in payload]
            if missing:
                raise InvalidCredentialsError(f"Claims faltando: {missing}")

            return payload

        except JWTError as e:
            logger.warning("Token de email inválido: %s", str(e))
            err_msg = str(e).lower()
            if "exp" in err_msg or "expired" in err_msg:
                raise TokenExpiredError("Link de verificação expirado")
            raise InvalidCredentialsError("Token de verificação inválido")
