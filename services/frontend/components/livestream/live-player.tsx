"use client";

import { Card, CardContent } from "@/components/ui/card";
import { HLSPlayer } from "./hls-player";
import type { Live } from "@/types/livestream";

interface LivePlayerProps {
  live: Live;
}

export function LivePlayer({ live }: LivePlayerProps) {
  const isLive = live.status === "live";
  const isScheduled = live.status === "scheduled";
  const isFinished = live.status === "finished";
  const isCancelled = live.status === "cancelled";

  const getPlayerMessage = () => {
    if (isFinished) {
      return {
        title: "Transmissão Finalizada",
        description: "Esta live foi encerrada e não está mais disponível para visualização.",
        icon: "🏁"
      };
    }
    if (isCancelled) {
      return {
        title: "Transmissão Cancelada",
        description: "Esta live foi cancelada e não chegou a ser transmitida.",
        icon: "❌"
      };
    }
    if (isScheduled) {
      return {
        title: "Aguardando Transmissão",
        description: "A live ainda não foi iniciada.",
        icon: "⏳"
      };
    }
    return null;
  };

  const message = getPlayerMessage();

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="relative w-full flex-1 bg-gray-900 rounded-xl overflow-hidden">
          {isLive ? (
            <>
              <HLSPlayer 
                streamKey={live.streamKey} 
                isLive={isLive}
                autoPlay={true}
              />

              <div className="absolute top-3 right-3 z-10">
                <div className="flex items-center gap-1.5 bg-destructive/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-xs font-bold uppercase">Ao Vivo</span>
                </div>
              </div>
            </>
          ) : message && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center space-y-4 px-6 max-w-md text-white">
                <div className="text-6xl">{message.icon}</div>
                <h3 className="text-white text-2xl font-bold">{message.title}</h3>
                <p className="text-gray-400 text-sm">{message.description}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
