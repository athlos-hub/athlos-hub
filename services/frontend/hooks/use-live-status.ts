"use client";

import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "./use-websocket";
import type { Live, JoinLivePayload } from "@/types/livestream";

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_LIVESTREAM_API_URL || "http://localhost:3333";

export function useLiveStatus(liveId: string, initialLive: Live | null) {
  const [live, setLive] = useState<Live | null>(initialLive);
  
  const { isConnected, connect, disconnect, emit, on, off } = useWebSocket({
    url: WEBSOCKET_URL,
    namespace: "/lives",
    autoConnect: false,
  });

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

    const handleLiveEvent = (...args: unknown[]) => {
      const event = args[0] as { eventType: string; data: { status: string }; timestamp: string };
      
      if (event.eventType === "status-change") {
        console.log("🔄 Status da live mudou:", event.data.status);
        
        setLive((prevLive) => {
          if (!prevLive) return prevLive;
          
          return {
            ...prevLive,
            status: event.data.status as Live["status"],
            startedAt: event.data.status === "live" && !prevLive.startedAt 
              ? event.timestamp 
              : prevLive.startedAt,
            endedAt: event.data.status === "finished" && !prevLive.endedAt 
              ? event.timestamp 
              : prevLive.endedAt,
          };
        });
      }
    };

    on("live-event", handleLiveEvent);

    return () => {
      off("live-event", handleLiveEvent);
    };
  }, [isConnected, liveId, emit, on, off]);

  const updateLive = useCallback((updatedLive: Live) => {
    setLive(updatedLive);
  }, []);

  return {
    live,
    updateLive,
    isConnected,
  };
}
