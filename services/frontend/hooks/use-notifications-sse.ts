"use client"

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { Notification } from '@/types/notification';

interface SSEEvent {
  type: 'notification' | 'unread_count' | 'connected';
  data: Notification | { count: number } | { message: string };
}

interface UseNotificationsSSEOptions {
  onNotification?: (notification: Notification) => void;
  onUnreadCountUpdate?: (count: number) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useNotificationsSSE(options: UseNotificationsSSEOptions = {}) {
  const { data: session } = useSession();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const connect = useCallback(() => {
    if (typeof EventSource === 'undefined') {
      return;
    }

    if (!session?.user?.id) {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8100/api/v1';
      const url = `${apiGatewayUrl}/notifications/stream?user_id=${session.user.id}`;
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        reconnectAttemptsRef.current = 0;
        callbacksRef.current.onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data);
          
          if (sseEvent.type === 'notification') {
            callbacksRef.current.onNotification?.(sseEvent.data as Notification);
          } else if (sseEvent.type === 'unread_count') {
            const count = (sseEvent.data as { count: number }).count;
            callbacksRef.current.onUnreadCountUpdate?.(count);
          } else if (sseEvent.type === 'connected') {
            callbacksRef.current.onConnect?.();
          }
        } catch (error) {
        }
      };

      eventSource.onerror = (error) => {
        if (typeof EventSource !== 'undefined' && eventSource.readyState === EventSource.CLOSED) {
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectDelay * reconnectAttemptsRef.current);
          } else {
            callbacksRef.current.onError?.(new Error('Falha ao conectar ao stream de notificações após várias tentativas'));
          }
        }
      };
    } catch (error) {
      callbacksRef.current.onError?.(error as Error);
    }
  }, [session?.user?.id]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      callbacksRef.current.onDisconnect?.();
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session?.user?.id, connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: typeof EventSource !== 'undefined' && eventSourceRef.current?.readyState === EventSource.OPEN,
  };
}
