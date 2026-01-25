from typing import Dict, Any, List, Optional
from jose import jwt, JWTError
import logging

from ..exceptions import InvalidCredentialsError, TokenExpiredError

logger = logging.getLogger(__name__)

class JwtHandler:
    @staticmethod
    def decode_token(
        token: str,
        public_key: str,
        issuer: str,
        audience: Optional[str] = None,
        algorithms: List[str] = ["RS256"],
        verify_aud: bool = True
    ) -> Dict[str, Any]:
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
                issuer=issuer
            )

            required_claims = ['sub', 'exp', 'iat']
            missing = [c for c in required_claims if c not in payload]
            if missing:
                raise InvalidCredentialsError(f"Claims faltando: {missing}")

            return payload

        except JWTError as e:
            logger.warning(f"Token inválido na lib comum: {str(e)}")
            err_msg = str(e).lower()
            if "exp" in err_msg or "expired" in err_msg:
                raise TokenExpiredError()
            if "iss" in err_msg or "issuer" in err_msg:
                raise InvalidCredentialsError("Token de origem (Issuer) inválida")
            raise InvalidCredentialsError("Token inválido ou malformado")

    @staticmethod
    def decode_email_token(
            token: str,
            secret_key: str,
            algorithm: str = "HS256"
    ) -> Dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                secret_key,
                algorithms=[algorithm],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                }
            )

            required_claims = ['sub', 'exp', 'iat']
            missing = [c for c in required_claims if c not in payload]
            if missing:
                raise InvalidCredentialsError(f"Claims faltando: {missing}")

            return payload

        except JWTError as e:
            logger.warning(f"Token de email inválido: {str(e)}")
            err_msg = str(e).lower()
            if "exp" in err_msg or "expired" in err_msg:
                raise TokenExpiredError("Link de verificação expirado")
            raise InvalidCredentialsError("Token de verificação inválido")