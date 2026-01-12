"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveEvents } from "@/hooks/use-live-events";
import { EventItem } from "./event-item";
import { Loader2 } from "lucide-react";
import type { LiveStatus } from "@/types/livestream";

interface LiveEventsProps {
  liveId: string;
  liveStatus?: LiveStatus;
}

export function LiveEvents({ liveId, liveStatus }: LiveEventsProps) {
  const { events, isLoading, isConnected } = useLiveEvents(liveId);

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Eventos da Partida</CardTitle>
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

      <CardContent className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center px-4">
            <p className="text-sm text-muted-foreground">
              {liveStatus === "finished" 
                ? "Nenhum evento foi registrado durante esta live"
                : liveStatus === "cancelled"
                ? "Esta live foi cancelada antes de registrar eventos"
                : liveStatus === "live"
                ? "Aguardando eventos da partida..."
                : "Nenhum evento registrado ainda"}
            </p>
          </div>
        ) : (
          events
            .slice()
            .reverse()
            .map((event) => (
              <EventItem
                key={event.id}
                type={event.type}
                payload={event.payload}
                timestamp={event.timestamp}
              />
            ))
        )}
      </CardContent>
    </Card>
  );
}
