import { useEffect, useState, useRef, useCallback } from 'react';
import type { Scoreboard } from '@/types/scoreboard';

interface UseScoreboardReturn {
  scoreboard: Scoreboard | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

function getPublicApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_COMPETITIONS_API_URL ||
    'http://localhost:8100/api'
  ).replace(/\/$/, '');
}

/**
 * Hook para placar: bootstrap via GET público (Kong) + atualização em tempo real via WebSocket.
 */
export function useScoreboard(matchId: string | null): UseScoreboardReturn {
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const hasDataRef = useRef(false);
  const maxReconnectAttempts = 5;

  const applyScoreboard = useCallback((data: Scoreboard) => {
    hasDataRef.current = true;
    setScoreboard(data);
  }, []);

  const connect = useCallback(() => {
    if (!matchId) return;

    try {
      const getScoreboardWsUrl = () => {
        const baseUrl =
          process.env.NEXT_PUBLIC_SCOREBOARD_WS_URL || 'wss://athloshub.com.br/api';
        return baseUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
      };

      const wsUrl = `${getScoreboardWsUrl()}/scoreboard/ws/${matchId}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'initial_scoreboard' || message.type === 'scoreboard_update') {
            applyScoreboard(message.data as Scoreboard);
          } else if (message.type === 'error') {
            console.error('[Scoreboard] Erro do servidor:', message.message);
            if (!hasDataRef.current) {
              setError(message.message ?? 'Erro ao carregar placar');
            }
          }
        } catch (err) {
          console.error('[Scoreboard] Erro ao processar mensagem:', err, event.data);
        }
      };

      ws.onerror = () => {
        // Detalhes vêm no onclose; não sobrescrever erro se já temos placar via REST.
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else if (!hasDataRef.current) {
          setError('Falha ao conectar após múltiplas tentativas');
        }
      };
    } catch (err) {
      console.error('[Scoreboard] Erro ao criar WebSocket:', err);
      if (!hasDataRef.current) {
        setError('Erro ao estabelecer conexão');
      }
    }
  }, [matchId, applyScoreboard]);

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

  useEffect(() => {
    if (!isConnected || !wsRef.current) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  // Bootstrap REST (rota GET pública no Kong) — funciona sem sessão e cobre falha do WS.
  useEffect(() => {
    if (!matchId) {
      setScoreboard(null);
      hasDataRef.current = false;
      setError(null);
      return;
    }

    setScoreboard(null);
    hasDataRef.current = false;
    setError(null);

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${getPublicApiBase()}/scoreboard/${matchId}`, {
          method: 'GET',
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled && !hasDataRef.current) {
            setError('Não foi possível carregar o placar');
          }
          return;
        }
        const data = (await res.json()) as Scoreboard;
        if (!cancelled) {
          applyScoreboard(data);
          setError(null);
        }
      } catch (e) {
        console.error('[Scoreboard] REST bootstrap:', e);
        if (!cancelled && !hasDataRef.current) {
          setError('Não foi possível carregar o placar');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchId, applyScoreboard]);

  useEffect(() => {
    if (!matchId) return;
    reconnectAttemptsRef.current = 0;
    connect();

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
