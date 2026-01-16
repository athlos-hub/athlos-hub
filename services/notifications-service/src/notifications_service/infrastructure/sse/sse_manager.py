"""Gerenciador de conexões Server-Sent Events para notificações em tempo real."""

import asyncio
import json
import logging
from typing import Dict, Set
from uuid import UUID

logger = logging.getLogger(__name__)


class SSEManager:
    """Gerenciador de conexões SSE para broadcast de notificações."""

    def __init__(self):
        """Inicializa o gerenciador SSE."""
        self._connections: Dict[UUID, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: UUID) -> asyncio.Queue:
        """
        Cria uma nova conexão SSE para um usuário.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Queue para enviar eventos
        """
        queue = asyncio.Queue()
        
        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(queue)
        
        logger.info(f"Nova conexão SSE para usuário {user_id}. Total: {len(self._connections.get(user_id, []))}")
        return queue

    async def disconnect(self, user_id: UUID, queue: asyncio.Queue):
        """
        Remove uma conexão SSE.
        
        Args:
            user_id: ID do usuário
            queue: Queue da conexão a ser removida
        """
        async with self._lock:
            if user_id in self._connections:
                self._connections[user_id].discard(queue)
                if not self._connections[user_id]:
                    del self._connections[user_id]
        
        logger.info(f"Conexão SSE removida para usuário {user_id}")

    async def send_notification(self, user_id: UUID, notification_data: dict):
        """
        Envia uma notificação para todas as conexões de um usuário.
        
        Args:
            user_id: ID do usuário destinatário
            notification_data: Dados da notificação
        """
        async with self._lock:
            queues = self._connections.get(user_id, set()).copy()
        
        if not queues:
            logger.warning(f"Nenhuma conexão SSE ativa para usuário {user_id}. Conexões ativas: {len(self._connections)}")
            return
        
        logger.info(f"Enviando notificação via SSE para {len(queues)} conexão(ões) do usuário {user_id}")
        
        event_data = json.dumps({
            "type": "notification",
            "data": notification_data
        })
        
        for queue in queues:
            try:
                await queue.put(event_data)
                logger.info(f"Notificação enviada via SSE para usuário {user_id} (queue: {id(queue)})")
            except Exception as e:
                logger.error(f"Erro ao enviar notificação via SSE: {e}", exc_info=True)
                async with self._lock:
                    if user_id in self._connections:
                        self._connections[user_id].discard(queue)

    async def send_unread_count_update(self, user_id: UUID, count: int):
        """
        Envia atualização de contagem de não lidas.
        
        Args:
            user_id: ID do usuário
            count: Nova contagem de não lidas
        """
        async with self._lock:
            queues = self._connections.get(user_id, set()).copy()
        
        if not queues:
            return
        
        event_data = json.dumps({
            "type": "unread_count",
            "data": {"count": count}
        })
        
        for queue in queues:
            try:
                await queue.put(event_data)
            except Exception as e:
                logger.error(f"Erro ao enviar atualização de contagem: {e}")
                async with self._lock:
                    if user_id in self._connections:
                        self._connections[user_id].discard(queue)

    def get_active_connections_count(self, user_id: UUID) -> int:
        """
        Retorna o número de conexões ativas para um usuário.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Número de conexões ativas
        """
        return len(self._connections.get(user_id, set()))


sse_manager = SSEManager()
