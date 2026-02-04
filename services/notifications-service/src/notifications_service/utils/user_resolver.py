"""Utilitários para resolução de user_id."""

from uuid import UUID
from typing import Union, Optional

import logging

from notifications_service.infrastructure.external.auth_client import auth_client
logger = logging.getLogger(__name__)


async def resolve_user_id(user_id_or_keycloak_id: Union[str, UUID]) -> Optional[UUID]:
    """
    Resolve user_id aceitando tanto user.id quanto keycloak_id.
    
    Tenta primeiro interpretar como UUID direto (user.id).
    Se falhar, assume que é keycloak_id e busca o user.id no auth-service.
    
    Args:
        user_id_or_keycloak_id: Pode ser user.id (UUID) ou keycloak_id (string UUID)
        
    Returns:
        UUID do usuário, ou None se não encontrado
    """
    if isinstance(user_id_or_keycloak_id, UUID):
        return user_id_or_keycloak_id
    
    user_id_str = str(user_id_or_keycloak_id)
    
    try:
        user_uuid = UUID(user_id_str)
        
        return user_uuid
        
    except ValueError:
        logger.warning(f"ID inválido fornecido: {user_id_str}")
        return None


async def ensure_user_id(user_id_or_keycloak_id: Union[str, UUID]) -> UUID:
    """
    Garante que temos um user_id válido, lançando exceção se não encontrar.
    
    Args:
        user_id_or_keycloak_id: Pode ser user.id (UUID) ou keycloak_id (string UUID)
        
    Returns:
        UUID do usuário
        
    Raises:
        ValueError: Se o user_id não puder ser resolvido
    """
    user_id = await resolve_user_id(user_id_or_keycloak_id)
    
    if user_id is None:
        raise ValueError(f"Não foi possível resolver user_id para: {user_id_or_keycloak_id}")
    
    return user_id
