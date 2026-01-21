"use client";

import { useEffect, useState } from "react";
import { useWebSocket } from "./use-websocket";
import type { MatchEvent, JoinLivePayload } from "@/types/livestream";

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_LIVESTREAM_WS_URL || "http://localhost:3333";

export function useLiveEvents(liveId: string) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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

    const handleEventsHistory = (...args: unknown[]) => {
      const history = args[0] as MatchEvent[];
      setEvents(history);
      setIsLoading(false);
    };

    const handleMatchEvent = (...args: unknown[]) => {
      const event = args[0] as MatchEvent;
      setEvents((prev) => [...prev, event]);
    };

    on("events-history", handleEventsHistory);
    on("match-event", handleMatchEvent);

    return () => {
      off("events-history", handleEventsHistory);
      off("match-event", handleMatchEvent);
    };
  }, [isConnected, liveId, emit, on, off]);

  return {
    events,
    isLoading,
    isConnected,
  };
}
