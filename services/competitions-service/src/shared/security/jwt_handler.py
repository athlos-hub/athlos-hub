import logging
from typing import Any, Dict, List, Optional

from jose import JWTError, jwt

from shared.exceptions import InvalidCredentialsError, TokenExpiredError

logger = logging.getLogger(__name__)


class JwtHandler:
    @staticmethod
    def decode_token(
        token: str,
        public_key: str,
        issuer: str,
        audience: Optional[str] = None,
        algorithms: List[str] = None,
        verify_aud: bool = True,
    ) -> Dict[str, Any]:
        if algorithms is None:
            algorithms = ["RS256"]
        try:
            options = {
                "verify_signature": True,
                "verify_aud": verify_aud,
                "verify_exp": True,
                "verify_iss": True,
            }

            payload = jwt.decode(
                token,
                public_key,
                algorithms=algorithms,
                options=options,
                audience=audience,
                issuer=issuer,
            )

            required_claims = ["sub", "exp", "iat"]
            missing = [c for c in required_claims if c not in payload]
            if missing:
                raise InvalidCredentialsError(f"Claims faltando: {missing}")

            return payload

        except JWTError as e:
            logger.warning("Token inválido: %s", str(e))
            err_msg = str(e).lower()
            if "exp" in err_msg or "expired" in err_msg:
                raise TokenExpiredError()
            if "iss" in err_msg or "issuer" in err_msg:
                raise InvalidCredentialsError("Token de origem (Issuer) inválida")
            raise InvalidCredentialsError("Token inválido ou malformado")
