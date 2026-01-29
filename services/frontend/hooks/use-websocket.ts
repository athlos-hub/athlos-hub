"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseWebSocketOptions {
  url: string;
  namespace?: string;
  autoConnect?: boolean;
}

export function useWebSocket({ url, namespace = "", autoConnect = false }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const createSocket = () => {
    const baseUrl = url.replace(/\/$/, "");
    const fullUrl = `${baseUrl}${namespace}`;
    
    console.log("Tentando conectar em:", fullUrl);

    const socket = io(fullUrl, {
      transports: ["polling", "websocket"], 
      path: "/socket.io",
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Conectado ao Socket.io!", socket.id);
      setIsConnected(true);
    });

    socket.on("connect_error", (err) => {
      console.error("Erro de conexão Socket.io:", err);
    });

    socket.on("disconnect", () => {
      console.log("Desconectado do Socket.io");
      setIsConnected(false);
    });

    return socket;
  };

  useEffect(() => {
    if (!autoConnect) return;
    
    if (socketRef.current) return;

    socketRef.current = createSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [url, namespace, autoConnect]);

  const connect = () => {
    if (socketRef.current) return;
    socketRef.current = createSocket();
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  const emit = (event: string, data?: unknown) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event: string, callback: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}