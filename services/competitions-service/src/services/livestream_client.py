"""
Cliente HTTP para comunicação com o Livestream Service
"""
import httpx
import logging
from typing import Optional, Dict, Any
from uuid import UUID

logger = logging.getLogger(__name__)


class LivestreamClientError(Exception):
    """Exceção base para erros do cliente Livestream"""
    pass


class LivestreamServiceUnavailable(LivestreamClientError):
    """Exceção quando o live-service está indisponível"""
    pass


class LiveCreationFailed(LivestreamClientError):
    """Exceção quando falha ao criar uma live"""
    pass


class LivestreamClient:
    """Cliente para interagir com o Livestream Service"""
    
    def __init__(self, base_url: str, timeout: int = 10):
        """
        Args:
            base_url: URL base do live-service (ex: http://localhost:8004)
            timeout: Timeout em segundos para requisições
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
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
    
    async def create_live(
        self, 
        external_match_id: UUID, 
        organization_id: UUID,
        transmit_video: bool = True,
    ) -> Dict[str, Any]:
        """
        Cria uma nova live no live-service
        
        Args:
            external_match_id: ID da partida no competitions-service
            organization_id: ID da organização
            
        Returns:
            Dict com os dados da live criada
            
        Raises:
            LivestreamServiceUnavailable: Se o serviço estiver inacessível
            LiveCreationFailed: Se houver erro na criação da live
        """
        if not self._client:
            raise RuntimeError("Cliente não inicializado. Use async with LivestreamClient()")
        
        payload = {
            "externalMatchId": str(external_match_id),
            "organizationId": str(organization_id),
            "transmitVideo": transmit_video,
        }
        
        try:
            logger.info(
                f"Criando live para match {external_match_id} "
                f"na organização {organization_id}"
            )
            
            response = await self._client.post(
                "/api/lives",
                json=payload
            )
            
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Live criada com sucesso: {data.get('id')}")
            
            return data
            
        except httpx.TimeoutException as e:
            logger.error(f"Timeout ao criar live para match {external_match_id}: {e}")
            raise LivestreamServiceUnavailable(
                f"Livestream service timeout: {str(e)}"
            ) from e
            
        except httpx.ConnectError as e:
            logger.error(f"Erro de conexão com livestream service: {e}")
            raise LivestreamServiceUnavailable(
                f"Não foi possível conectar ao live service: {str(e)}"
            ) from e
            
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Erro HTTP ao criar live para match {external_match_id}: "
                f"Status {e.response.status_code} - {e.response.text}"
            )
            raise LiveCreationFailed(
                f"Falha ao criar live: {e.response.status_code} - {e.response.text}"
            ) from e
            
        except Exception as e:
            logger.error(f"Erro inesperado ao criar live: {e}")
            raise LiveCreationFailed(f"Erro inesperado: {str(e)}") from e
    
    async def health_check(self) -> bool:
        """
        Verifica se o live-service está acessível
        
        Returns:
            True se o serviço está disponível, False caso contrário
        """
        if not self._client:
            raise RuntimeError("Cliente não inicializado. Use async with LivestreamClient()")
        
        try:
            response = await self._client.get("/api/health", timeout=3)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Health check falhou: {e}")
            return False
    
    async def publish_match_event(
        self,
        live_id: str,
        event_type: str,
        payload: Dict[str, Any],
        auth_token: Optional[str] = None
    ) -> bool:
        """
        Publica um evento de partida na timeline da live
        
        Args:
            live_id: ID da live
            event_type: Tipo do evento (SCORE, FOUL, etc)
            payload: Dados do evento
            auth_token: Token JWT para autenticação (opcional)
            
        Returns:
            True se o evento foi publicado com sucesso, False caso contrário
        """
        if not self._client:
            raise RuntimeError("Cliente não inicializado. Use async with LivestreamClient()")
        
        try:
            headers = {}
            if auth_token:
                headers["Authorization"] = f"Bearer {auth_token}"
            
            logger.info(f"Publicando evento {event_type} para live {live_id}")
            
            response = await self._client.post(
                f"/api/lives/{live_id}/events",
                json={"type": event_type, "payload": payload},
                headers=headers
            )
            
            response.raise_for_status()
            logger.info(f"Evento {event_type} publicado com sucesso na live {live_id}")
            return True
            
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Erro HTTP ao publicar evento na live {live_id}: "
                f"Status {e.response.status_code} - {e.response.text}"
            )
            return False
            
        except Exception as e:
            logger.error(f"Erro ao publicar evento na live {live_id}: {e}")
            return False