from keycloak import KeycloakAdmin, KeycloakOpenIDConnection
from auth_service.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_keycloak_admin_client() -> KeycloakAdmin:
    """
    Retorna uma instância única e configurada do KeycloakAdmin.
    Usa KeycloakOpenIDConnection para evitar erros de URL (404/HTML).
    """
    
    connection = KeycloakOpenIDConnection(
        server_url=settings.KEYCLOAK_URL,
        realm_name=settings.KEYCLOAK_REALM,
        client_id=settings.KEYCLOAK_CLIENT_ID,
        client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
        verify=True,
        timeout=20
    )

    return KeycloakAdmin(connection=connection)