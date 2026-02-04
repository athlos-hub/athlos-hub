import { useEffect, useState, useRef, useCallback } from 'react';
import type { SegmentScore, Scoreboard } from '@/types/scoreboard';

interface UseScoreboardReturn {
  scoreboard: Scoreboard | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

/**
 * Hook para conectar ao WebSocket do placar de uma partida
 * @param matchId - ID da partida
 */
export function useScoreboard(matchId: string | null): UseScoreboardReturn {
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!matchId) return;

    try {
      // URL do WebSocket (ajuste conforme sua configuração)
      const wsUrl = `ws://localhost:8001/api/v1/scoreboard/ws/${matchId}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Scoreboard] Conectado ao WebSocket');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'initial_scoreboard' || message.type === 'scoreboard_update') {
            setScoreboard(message.data);
          } else if (message.type === 'error') {
            console.error('[Scoreboard] Erro do servidor:', message.message);
            setError(message.message);
          } else if (message.type === 'pong') {
            // Resposta ao ping - conexão está ativa
          }
        } catch (err) {
          console.error('[Scoreboard] Erro ao processar mensagem:', err);
        }
      };

      ws.onerror = () => {
        // O evento onerror do WebSocket não fornece detalhes úteis
        // O erro real geralmente aparece no onclose
        setError('Erro na conexão com o servidor');
      };

      ws.onclose = () => {
        console.log('[Scoreboard] WebSocket desconectado');
        setIsConnected(false);
        wsRef.current = null;

        // Tentativa de reconexão automática
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[Scoreboard] Tentando reconectar em ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          setError('Falha ao conectar após múltiplas tentativas');
        }
      };
    } catch (err) {
      console.error('[Scoreboard] Erro ao criar WebSocket:', err);
      setError('Erro ao estabelecer conexão');
    }
  }, [matchId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  // Envia ping periodicamente para manter a conexão
  useEffect(() => {
    if (!isConnected || !wsRef.current) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 30000); // Ping a cada 30 segundos

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  // Conecta/desconecta quando o matchId mudar
  useEffect(() => {
    if (matchId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [matchId, connect, disconnect]);

  return {
    scoreboard,
    isConnected,
    error,
    reconnect,
  };
}
