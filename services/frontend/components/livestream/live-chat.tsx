"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLiveChat } from "@/hooks/use-live-chat";
import { Send, Loader2, Lock } from "lucide-react";
import type { ChatMessage } from "@/types/livestream";

interface LiveChatProps {
  liveId: string;
  userId: string | null;
  userName: string | null;
  isAuthenticated: boolean;
  liveStatus: "scheduled" | "live" | "finished" | "cancelled";
}

export function LiveChat({ liveId, userId, userName, isAuthenticated, liveStatus }: LiveChatProps) {
  const [messageInput, setMessageInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, isConnected, sendMessage } = useLiveChat(
    liveId, 
    userId || "anonymous", 
    userName || "Anônimo"
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !isAuthenticated || liveStatus !== "live") return;

    sendMessage(messageInput);
    setMessageInput("");
  };

  const formatTime = (timestamp: Date | string) => {
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const canSendMessage = isConnected && isAuthenticated && liveStatus === "live";
  const isLiveEnded = liveStatus === "finished" || liveStatus === "cancelled";
  const isLiveNotStarted = liveStatus === "scheduled";

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Chat ao Vivo</CardTitle>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center px-4">
              <p className="text-sm text-muted-foreground">
                {liveStatus === "finished" 
                  ? "Nenhuma mensagem foi enviada durante esta live"
                  : liveStatus === "cancelled"
                  ? "Esta live foi cancelada antes de receber mensagens"
                  : liveStatus === "live"
                  ? "Seja o primeiro a enviar uma mensagem!"
                  : "Aguardando mensagens..."}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <ChatMessageItem key={index} message={msg} formatTime={formatTime} />
            ))
          )}
        </div>

        <div className="border-t p-4">
          {isLiveEnded ? (
            <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Chat desabilitado - Live {liveStatus === "finished" ? "finalizada" : "cancelada"}
              </p>
            </div>
          ) : isLiveNotStarted ? (
            <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Chat será liberado quando a transmissão iniciar
              </p>
            </div>
          ) : !isAuthenticated ? (
            <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Faça login para enviar mensagens no chat
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={!canSendMessage}
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!canSendMessage || !messageInput.trim()}
                className="bg-main hover:bg-main/90 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ChatMessageItemProps {
  message: ChatMessage;
  formatTime: (timestamp: Date | string) => string;
}

function ChatMessageItem({ message, formatTime }: ChatMessageItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-sm">{message.userName}</span>
        <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
      </div>
      <p className="text-sm wrap-break-word">{message.message}</p>
    </div>
  );
}
