"""
Cliente HTTP para comunicação com o Auth Service
"""
import httpx
import logging
from typing import List, Optional, Dict, Any
from uuid import UUID

logger = logging.getLogger(__name__)


class AuthClientError(Exception):
    """Exceção base para erros do cliente Auth"""
    pass


class AuthServiceUnavailable(AuthClientError):
    """Exceção quando o serviço de auth está indisponível"""
    pass


class MemberValidationFailed(AuthClientError):
    """Exceção quando a validação de membros falha"""
    def __init__(self, message: str, invalid_users: List[Dict[str, Any]] = None):
        super().__init__(message)
        self.invalid_users = invalid_users or []


class OrganizationNotFound(AuthClientError):
    """Exceção quando a organização não é encontrada"""
    pass


class PermissionDenied(AuthClientError):
    """Exceção quando o usuário não tem permissão"""
    def __init__(
        self, 
        message: str, 
        user_id: UUID = None, 
        organization_slug: str = None,
        role: str = None
    ):
        super().__init__(message)
        self.user_id = user_id
        self.organization_slug = organization_slug
        self.role = role


class AuthClient:
    """Cliente para interagir com o Auth Service"""
    
    def __init__(self, base_url: str = None, timeout: int = None):
        """
        Args:
            base_url: URL base do auth-service (ex: http://localhost:8000)
            timeout: Timeout em segundos para requisições
        """
        # Importa settings aqui para evitar circular import
        from src.config.settings import settings
        
        self.base_url = (base_url or settings.AUTH_SERVICE_URL).rstrip('/')
        self.timeout = timeout or settings.AUTH_SERVICE_TIMEOUT
        self._client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        """Context manager para gerenciar o ciclo de vida do cliente"""
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
            headers={
                "Content-Type": "application/json"
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Fecha o cliente ao sair do contexto"""
        if self._client:
            await self._client.aclose()
    
    async def validate_organization_members(
        self,
        organization_slug: str,
        keycloak_ids: List[UUID],
    ) -> Dict[str, Any]:
        """
        Valida se os usuários existem e são membros da organização.
        
        Args:
            organization_slug: Slug da organização
            keycloak_ids: Lista de Keycloak IDs dos usuários a validar
            
        Returns:
            Dict com os resultados da validação
            
        Raises:
            AuthServiceUnavailable: Se o serviço estiver inacessível
            OrganizationNotFound: Se a organização não existir
            MemberValidationFailed: Se algum usuário não for membro válido
        """
        if not self._client:
            raise RuntimeError("Cliente não inicializado. Use async with AuthClient()")
        
        payload = {
            "organization_slug": organization_slug,
            "keycloak_ids": [str(kid) for kid in keycloak_ids]
        }
        
        try:
            logger.info(
                f"Validando {len(keycloak_ids)} usuários para organização {organization_slug}"
            )
            
            response = await self._client.post(
                "/api/v1/internal/validate-members",
                json=payload
            )
            
            response.raise_for_status()
            
            data = response.json()
            
            # Verificar se a organização existe
            if not data.get("organization_exists", False):
                raise OrganizationNotFound(
                    f"Organização '{organization_slug}' não encontrada"
                )
            
            # Verificar se todos os usuários são válidos
            if not data.get("all_valid", False):
                invalid_users = [
                    r for r in data.get("results", [])
                    if not r.get("is_member", False)
                ]
                
                error_messages = []
                for user in invalid_users:
                    keycloak_id = user.get("keycloak_id")
                    error = user.get("error", "Usuário inválido")
                    username = user.get("username")
                    if username:
                        error_messages.append(f"{username} ({keycloak_id}): {error}")
                    else:
                        error_messages.append(f"{keycloak_id}: {error}")
                
                raise MemberValidationFailed(
                    f"Validação de membros falhou: {'; '.join(error_messages)}",
                    invalid_users=invalid_users
                )
            
            logger.info(
                f"Validação bem-sucedida: {data.get('valid_count')}/{len(keycloak_ids)} usuários válidos"
            )
            
            return data
            
        except httpx.ConnectError as e:
            logger.error(f"Falha na conexão com auth-service: {e}")
            raise AuthServiceUnavailable(
                "Auth Service não está disponível. Tente novamente mais tarde."
            ) from e
            
        except httpx.TimeoutException as e:
            logger.error(f"Timeout na conexão com auth-service: {e}")
            raise AuthServiceUnavailable(
                "Auth Service demorou muito para responder. Tente novamente."
            ) from e
            
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Erro HTTP do auth-service: {e.response.status_code} - {e.response.text}"
            )
            if e.response.status_code == 404:
                raise OrganizationNotFound(
                    f"Organização '{organization_slug}' não encontrada"
                ) from e
            raise AuthClientError(
                f"Erro ao validar membros: {e.response.text}"
            ) from e
    
    async def check_organization_exists(
        self,
        organization_slug: str,
    ) -> Dict[str, Any]:
        """
        Verifica se uma organização existe.
        
        Args:
            organization_slug: Slug da organização
            
        Returns:
            Dict com informações da organização se existir
            
        Raises:
            AuthServiceUnavailable: Se o serviço estiver inacessível
        """
        if not self._client:
            raise RuntimeError("Cliente não inicializado. Use async with AuthClient()")
        
        try:
            logger.info(f"Verificando existência da organização {organization_slug}")
            
            response = await self._client.get(
                f"/api/v1/internal/organizations/{organization_slug}/exists"
            )
            
            response.raise_for_status()
            
            data = response.json()
            
            logger.info(
                f"Organização {organization_slug}: "
                f"{'existe' if data.get('exists') else 'não existe'}"
            )
            
            return data
            
        except httpx.ConnectError as e:
            logger.error(f"Falha na conexão com auth-service: {e}")
            raise AuthServiceUnavailable(
                "Auth Service não está disponível. Tente novamente mais tarde."
            ) from e
            
        except httpx.TimeoutException as e:
            logger.error(f"Timeout na conexão com auth-service: {e}")
            raise AuthServiceUnavailable(
                "Auth Service demorou muito para responder. Tente novamente."
            ) from e
            
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Erro HTTP do auth-service: {e.response.status_code} - {e.response.text}"
            )
            raise AuthClientError(
                f"Erro ao verificar organização: {e.response.text}"
            ) from e

    async def check_user_permission(
        self,
        keycloak_id: UUID,
        organization_slug: str,
        allowed_roles: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Verifica se um usuário tem permissão em uma organização.
        
        Args:
            keycloak_id: Keycloak ID do usuário
            organization_slug: Slug da organização
            allowed_roles: Roles permitidas (default: OWNER, ORGANIZER)
            
        Returns:
            Dict com resultado da verificação de permissão
            
        Raises:
            AuthServiceUnavailable: Se o serviço estiver inacessível
            PermissionDenied: Se o usuário não tiver permissão
        """
        if not self._client:
            raise RuntimeError("Cliente não inicializado. Use async with AuthClient()")
        
        if allowed_roles is None:
            allowed_roles = ["OWNER", "ORGANIZER"]
        
        payload = {
            "keycloak_id": str(keycloak_id),
            "organization_slug": organization_slug,
            "allowed_roles": allowed_roles
        }
        
        try:
            logger.info(
                f"Verificando permissão do usuário {keycloak_id} na organização {organization_slug}"
            )
            
            response = await self._client.post(
                "/api/v1/internal/check-permission",
                json=payload
            )
            
            response.raise_for_status()
            
            data = response.json()
            
            if not data.get("has_permission", False):
                error_msg = data.get("error", "Permissão negada")
                raise PermissionDenied(
                    f"Usuário não tem permissão: {error_msg}",
                    user_id=keycloak_id,
                    organization_slug=organization_slug,
                    role=data.get("role")
                )
            
            logger.info(
                f"Permissão verificada: usuário {keycloak_id} tem role {data.get('role')} "
                f"em {organization_slug}"
            )
            
            return data
            
        except httpx.ConnectError as e:
            logger.error(f"Falha na conexão com auth-service: {e}")
            raise AuthServiceUnavailable(
                "Auth Service não está disponível. Tente novamente mais tarde."
            ) from e
            
        except httpx.TimeoutException as e:
            logger.error(f"Timeout na conexão com auth-service: {e}")
            raise AuthServiceUnavailable(
                "Auth Service demorou muito para responder. Tente novamente."
            ) from e
            
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Erro HTTP do auth-service: {e.response.status_code} - {e.response.text}"
            )
            raise AuthClientError(
                f"Erro ao verificar permissão: {e.response.text}"
            ) from e


def get_auth_client(base_url: str, timeout: int = 10) -> AuthClient:
    """
    Factory function para criar um AuthClient.
    
    Args:
        base_url: URL base do auth-service
        timeout: Timeout em segundos
        
    Returns:
        AuthClient configurado
    """
    return AuthClient(base_url=base_url, timeout=timeout)
