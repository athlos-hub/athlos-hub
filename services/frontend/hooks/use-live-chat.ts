"use client";

import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "./use-websocket";
import { getChatHistory } from "@/actions/lives";
import { toast } from "sonner";
import type { ChatMessage, JoinLivePayload, ChatMessagePayload } from "@/types/livestream";

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_LIVESTREAM_WS_URL || "http://localhost:3333";

export function useLiveChat(liveId: string, userId: string, userName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  
  const { isConnected, connect, disconnect, emit, on, off } = useWebSocket({
    url: WEBSOCKET_URL,
    namespace: "/lives",
    autoConnect: false,
  });

  useEffect(() => {
    if (!liveId || historyLoaded) return;

    async function loadHistory() {
      try {
        const history = await getChatHistory(liveId, 50);
        setMessages(history.reverse());
        setHistoryLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar histórico do chat:", error);
        setHistoryLoaded(true);
      }
    }

    loadHistory();
  }, [liveId, historyLoaded]);

  useEffect(() => {
    if (!liveId) return;

    connect();

    return () => {
      if (liveId) {
        const leavePayload: JoinLivePayload = { liveId };
        emit("leave-live", leavePayload);
      }
      disconnect();
    };
  }, [liveId]);

  useEffect(() => {
    if (!isConnected || !liveId) return;

    const joinPayload: JoinLivePayload = { liveId };
    emit("join-live", joinPayload);

    const handleChatMessage = (...args: unknown[]) => {
      const message = args[0] as ChatMessage;
      setMessages((prev) => {
        const isDuplicate = prev.some(
          (m) => 
            m.userId === message.userId && 
            m.message === message.message && 
            Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
        );
        if (isDuplicate) return prev;
        return [...prev, message];
      });
    };

    const handleJoined = () => {
      setIsLoading(false);
    };

    const handleRateLimit = (...args: unknown[]) => {
      const data = args[0] as { message: string; retryAfter: number };
      toast.warning(data.message, {
        description: `Aguarde ${data.retryAfter} segundos antes de enviar outra mensagem`,
        duration: data.retryAfter * 1000,
      });
    };

    on("chat-message", handleChatMessage);
    on("joined-live", handleJoined);
    on("rate-limit-exceeded", handleRateLimit);

    return () => {
      off("chat-message", handleChatMessage);
      off("joined-live", handleJoined);
      off("rate-limit-exceeded", handleRateLimit);
    };
  }, [isConnected, liveId, emit, on, off]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!isConnected || !message.trim()) return;

      const payload: ChatMessagePayload = {
        liveId,
        userId,
        userName,
        message: message.trim(),
      };

      emit("chat-message", payload);
    },
    [isConnected, liveId, userId, userName, emit]
  );

  return {
    messages,
    isLoading,
    isConnected,
    sendMessage,
  };
}
