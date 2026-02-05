from typing import Dict, Set
import uuid
import json
from fastapi import WebSocket

class ScoreboardConnectionManager:
    """Gerenciador de conexões WebSocket para placares de partidas"""
    
    def __init__(self):
        # Dicionário: match_id -> Set de WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, match_id: str):
        """Conecta um cliente ao WebSocket de uma partida específica"""
        await websocket.accept()
        
        if match_id not in self.active_connections:
            self.active_connections[match_id] = set()
        
        self.active_connections[match_id].add(websocket)
        print(f"[ScoreboardWS] Cliente conectado à partida {match_id}. Total: {len(self.active_connections[match_id])}")
    
    def disconnect(self, websocket: WebSocket, match_id: str):
        """Desconecta um cliente do WebSocket"""
        if match_id in self.active_connections:
            self.active_connections[match_id].discard(websocket)
            
            # Remove o conjunto se estiver vazio
            if not self.active_connections[match_id]:
                del self.active_connections[match_id]
            
            print(f"[ScoreboardWS] Cliente desconectado da partida {match_id}. Restantes: {len(self.active_connections.get(match_id, []))}")
    
    async def broadcast_to_match(self, match_id: str, message: dict):
        """Envia uma mensagem para todos os clientes conectados a uma partida"""
        import logging
        logger = logging.getLogger("app.scoreboard")
        
        logger.info(f"[BROADCAST] Tentando broadcast para match {match_id}")
        
        if match_id not in self.active_connections:
            logger.warning(f"[BROADCAST] Nenhuma conexão ativa para match {match_id}")
            return
        
        connections_count = len(self.active_connections[match_id])
        logger.info(f"[BROADCAST] Enviando para {connections_count} cliente(s) conectado(s)")
        
        # Lista de conexões a remover (se falharem)
        dead_connections = []
        sent_count = 0
        
        for connection in self.active_connections[match_id].copy():
            try:
                await connection.send_json(message)
                sent_count += 1
                logger.debug(f"[BROADCAST] Mensagem enviada para cliente (total enviado: {sent_count}/{connections_count})")
            except Exception as e:
                logger.error(f"[BROADCAST] Erro ao enviar para cliente: {e}")
                dead_connections.append(connection)
        
        # Remove conexões mortas
        for connection in dead_connections:
            self.disconnect(connection, match_id)
        
        logger.info(f"[BROADCAST] Broadcast concluído: {sent_count} enviados, {len(dead_connections)} falharam")
    
    def get_connection_count(self, match_id: str) -> int:
        """Retorna o número de conexões ativas para uma partida"""
        return len(self.active_connections.get(match_id, set()))


# Instância global do gerenciador
scoreboard_manager = ScoreboardConnectionManager()
