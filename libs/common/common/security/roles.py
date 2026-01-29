from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Union, Callable, Awaitable, Optional
from .jwt_handler import JwtHandler
import inspect

security = HTTPBearer()

class RoleChecker:
    def __init__(
        self,
        allowed_roles: List[str],
        public_key: Union[str, Callable[[], Awaitable[str]]],
        issuer: str,
        audience: Optional[str] = None
    ):
        self.allowed_roles = allowed_roles
        self.public_key = public_key
        self.audience = audience
        self.issuer = issuer

    async def _get_key(self) -> str:
        if callable(self.public_key):
            result = self.public_key()
            if inspect.isawaitable(result):
                return await result
            return result
        return self.public_key

    async def __call__(self, token: HTTPAuthorizationCredentials = Depends(security)):
        resolved_key = await self._get_key()

        payload = JwtHandler.decode_token(
            token=token.credentials,
            public_key=resolved_key,
            audience=None,
            issuer=self.issuer,
            verify_aud=False,
        )

        realm_access = payload.get("realm_access", {})
        user_roles = realm_access.get("roles", [])

        has_role = any(role in user_roles for role in self.allowed_roles)

        if not has_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Requer permissão: {self.allowed_roles}"
            )

        return payload