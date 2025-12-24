import logging
from typing import Callable

from common.exceptions import InvalidCredentialsError, TokenExpiredError
from common.security.jwt_handler import JwtHandler
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from auth_service.core.config import settings
from auth_service.domain.services.auth_service import AuthService

logger = logging.getLogger(__name__)


class KeycloakAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.public_paths = {
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/users/",
            "/auth/",
        }

    def _is_public_path(self, path: str) -> bool:
        return any(path.startswith(p) for p in self.public_paths)

    async def dispatch(self, request: Request, call_next: Callable):
        if request.method == "OPTIONS":
            return await call_next(request)

        if self._is_public_path(request.url.path):
            return await call_next(request)

        try:
            auth_header = request.headers.get("authorization")

            if not auth_header or not auth_header.lower().startswith("bearer "):
                return await call_next(request)

            token = auth_header.split(" ", 1)[1]

            try:
                public_key = await AuthService.get_public_key()

                payload = JwtHandler.decode_token(
                    token=token,
                    public_key=public_key,
                    audience=settings.KEYCLOAK_CLIENT_ID,
                    issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}",
                )

                request.state.user_payload = payload
                request.state.user_id = payload.get("sub")

            except TokenExpiredError:
                return JSONResponse(
                    status_code=401,
                    content={
                        "error": "TokenExpiredError",
                        "message": "Token expirado",
                        "code": "TOKEN_EXPIRED",
                        "action": "refresh_token",
                    },
                )
            except InvalidCredentialsError as e:
                return JSONResponse(
                    status_code=401,
                    content={
                        "error": "InvalidCredentialsError",
                        "message": str(e),
                        "code": "INVALID_TOKEN",
                    },
                )
            except Exception as e:
                logger.warning(f"Token malformado ou assinatura inválida: {e}")
                return JSONResponse(
                    status_code=401, content={"detail": "Token inválido ou malformado"}
                )

        except Exception as e:
            logger.exception(f"Erro crítico no middleware: {e}")
            return JSONResponse(
                status_code=500, content={"detail": "Erro interno de autenticação"}
            )

        response = await call_next(request)
        return response
