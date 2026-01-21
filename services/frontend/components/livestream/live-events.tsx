"use client";

import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveEvents } from "@/hooks/use-live-events";
import { EventItem } from "./event-item";
import { EventCreator } from "./event-creator";
import { Loader2, Radio } from "lucide-react";
import type { LiveStatus } from "@/types/livestream";

interface LiveEventsProps {
  liveId: string;
  liveStatus?: LiveStatus;
  canCreateEvents?: boolean;
}

export function LiveEvents({ liveId, liveStatus, canCreateEvents = false }: LiveEventsProps) {
  const { events, isLoading, isConnected } = useLiveEvents(liveId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLiveOrScheduled = liveStatus === "live" || liveStatus === "scheduled";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 border-b shrink-0 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">Eventos da Partida</CardTitle>
            <div className="flex items-center gap-1.5 ml-2">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              />
              <span className="text-[12px] text-muted-foreground">
                {isConnected ? "Ao vivo" : "Offline"}
              </span>
            </div>
          </div>
          
          {canCreateEvents && isLiveOrScheduled && (
            <EventCreator liveId={liveId} />
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Radio className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Nenhum evento registrado
            </p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              {liveStatus === "finished" 
                ? "Não houve eventos durante esta transmissão"
                : liveStatus === "cancelled"
                ? "Esta transmissão foi cancelada"
                : isLiveOrScheduled
                ? "Os eventos aparecerão aqui em tempo real"
                : "Aguardando início da transmissão"}
            </p>
          </div>
        ) : (
          <div ref={scrollRef} className="h-full overflow-y-auto p-3 space-y-2">
            {events
              .slice()
              .reverse()
              .map((event) => (
                <EventItem
                  key={event.id}
                  type={event.type}
                  payload={event.payload}
                  timestamp={event.timestamp}
                />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
