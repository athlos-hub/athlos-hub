"""Cliente para comunicação com o auth-service."""

import httpx
import logging
from uuid import UUID
from typing import Optional

from notifications_service.core.config import settings

logger = logging.getLogger(__name__)


class AuthServiceClient:
    """Cliente HTTP para o auth-service."""
    
    def __init__(self):
        self.base_url = settings.auth_service_url.rstrip('/')
        self.timeout = 5.0
    
    async def get_user_id_by_keycloak_id(self, keycloak_id: str) -> Optional[UUID]:
        """
        Busca o user_id (id da tabela users) usando o keycloak_id.
        
        Args:
            keycloak_id: ID do usuário no Keycloak
            
        Returns:
            UUID do usuário na tabela users, ou None se não encontrado
        """
        try:
            url = f"{self.base_url}/api/v1/users/by-keycloak-id/{keycloak_id}"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    data = response.json()
                    user_id = data.get('id')
                    
                    if user_id:
                        logger.debug(f"User ID encontrado para keycloak_id {keycloak_id}: {user_id}")
                        return UUID(user_id)
                
                logger.warning(f"User não encontrado para keycloak_id: {keycloak_id}")
                return None
                
        except Exception as e:
            logger.error(f"Erro ao buscar user_id do auth-service para keycloak_id {keycloak_id}: {e}")
            return None


auth_client = AuthServiceClient()
