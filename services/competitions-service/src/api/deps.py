"""Dependências de autenticação e autorização para o competitions-service."""

import logging
from typing import Annotated, List, Optional
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from common.security.jwt_handler import JwtHandler
from common.exceptions import InvalidCredentialsError, TokenExpiredError

from src.config.settings import settings
from src.services.auth_client import (
    AuthClient,
    AuthClientError,
    AuthServiceUnavailable,
    PermissionDenied,
)

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()

# Cache da chave pública do Keycloak
_public_key_cache: Optional[str] = None


async def get_keycloak_public_key() -> str:
    """Obtém a chave pública do Keycloak para verificação de JWT."""
    global _public_key_cache
    
    if _public_key_cache:
        return _public_key_cache
    
    try:
        # Remove barra final do KEYCLOAK_URL para evitar //realms
        keycloak_url = settings.KEYCLOAK_URL.rstrip('/')
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{keycloak_url}/realms/{settings.KEYCLOAK_REALM}"
            )
            response.raise_for_status()
            data = response.json()
            
            public_key = data.get("public_key")
            if not public_key:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Chave pública não encontrada no Keycloak"
                )
            
            _public_key_cache = (
                f"-----BEGIN PUBLIC KEY-----\n{public_key}\n-----END PUBLIC KEY-----"
            )
            return _public_key_cache
            
    except httpx.HTTPError as e:
        logger.error(f"Erro ao obter chave pública do Keycloak: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de autenticação indisponível"
        )


async def get_current_keycloak_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UUID:
    """
    Extrai o keycloak_id do token JWT.
    
    Returns:
        UUID do keycloak_id do usuário autenticado
        
    Raises:
        HTTPException 401: Se o token for inválido ou expirado
    """
    try:
        public_key = await get_keycloak_public_key()
        
        # Remove barra final do KEYCLOAK_URL para evitar //realms
        expected_issuer = f"{settings.KEYCLOAK_ISSUER.rstrip('/')}/realms/{settings.KEYCLOAK_REALM}"
     
        payload = JwtHandler.decode_token(
            token=credentials.credentials,
            public_key=public_key,
            audience=None,
            issuer=expected_issuer,
            verify_aud=False
        )
        
        # O 'sub' no token Keycloak é o keycloak_id do usuário
        keycloak_id = payload.get("sub")
        if not keycloak_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: 'sub' não encontrado"
            )
        
        return UUID(keycloak_id)
        
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado"
        )
    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


# Alias para compatibilidade - retorna keycloak_id
get_current_user_id = get_current_keycloak_id

# Scheme opcional para endpoints que podem funcionar com ou sem auth
optional_bearer_scheme = HTTPBearer(auto_error=False)


async def get_optional_keycloak_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer_scheme),
) -> Optional[UUID]:
    """
    Extrai o keycloak_id do token JWT se presente.
    
    Returns:
        UUID do keycloak_id do usuário autenticado ou None se não autenticado
    """
    if credentials is None:
        return None
    
    try:
        public_key = await get_keycloak_public_key()
        
        expected_issuer = f"{settings.KEYCLOAK_ISSUER.rstrip('/')}/realms/{settings.KEYCLOAK_REALM}"
        
        payload = JwtHandler.decode_token(
            token=credentials.credentials,
            public_key=public_key,
            audience=None,
            issuer=expected_issuer,
            verify_aud=False
        )
        
        keycloak_id = payload.get("sub")
        if not keycloak_id:
            return None
        
        return UUID(keycloak_id)
        
    except (TokenExpiredError, InvalidCredentialsError):
        return None


class RequireOrgPermission:
    """
    Dependência que verifica se o usuário tem permissão na organização.
    
    Uso:
        @router.post("/")
        async def create_something(
            data: SomeSchema,
            keycloak_id: UUID = Depends(get_current_keycloak_id),
            _: None = Depends(RequireOrgPermission(["OWNER", "ORGANIZER"]))
        ):
            ...
    """
    
    def __init__(self, allowed_roles: List[str] = None):
        """
        Args:
            allowed_roles: Roles permitidas (default: OWNER, ORGANIZER)
        """
        self.allowed_roles = allowed_roles or ["OWNER", "ORGANIZER"]
    
    async def __call__(
        self,
        organization_slug: str,
        keycloak_id: UUID = Depends(get_current_keycloak_id),
    ) -> UUID:
        """
        Verifica permissão do usuário na organização.
        
        Args:
            organization_slug: Slug da organização (extraído do path ou body)
            keycloak_id: Keycloak ID do usuário (injetado via Depends)
            
        Returns:
            UUID do keycloak_id se tiver permissão
            
        Raises:
            HTTPException 403: Se não tiver permissão
            HTTPException 404: Se organização não existir
            HTTPException 503: Se auth-service indisponível
        """
        auth_client = AuthClient(
            base_url=settings.AUTH_SERVICE_URL,
            timeout=settings.AUTH_SERVICE_TIMEOUT
        )
        
        try:
            async with auth_client:
                await auth_client.check_user_permission(
                    keycloak_id=keycloak_id,
                    organization_slug=organization_slug,
                    allowed_roles=self.allowed_roles
                )
            
            logger.info(
                f"Permissão concedida: user {keycloak_id} pode acessar org {organization_slug}"
            )
            return keycloak_id
            
        except PermissionDenied as e:
            logger.warning(
                f"Permissão negada: user {keycloak_id} tentou acessar org {organization_slug}. "
                f"Role atual: {e.role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "Você não tem permissão para realizar esta ação",
                    "required_roles": self.allowed_roles,
                    "your_role": e.role
                }
            )
        except AuthServiceUnavailable as e:
            logger.error(f"Auth service indisponível: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Serviço de autenticação temporariamente indisponível"
            )
        except AuthClientError as e:
            logger.error(f"Erro no auth client: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao verificar permissões"
            )


# Instâncias pré-configuradas para uso comum
require_owner_or_organizer = RequireOrgPermission(["OWNER", "ORGANIZER"])
require_owner = RequireOrgPermission(["OWNER"])


# Type aliases para injeção de dependência
CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]
