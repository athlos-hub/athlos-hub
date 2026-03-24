"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { subscribeUnreadCountStream } from '@/lib/api/unread-stream';

type Options = {
  onCount: (count: number) => void;
  onError?: (err: Error) => void;
};

/**
 * Mantém SSE da contagem de não lidas com Bearer (fetch stream), com reconexão simples.
 */
export function useUnreadCountSse({ onCount, onError }: Options) {
  const { data: session, status } = useSession();
  const onCountRef = useRef(onCount);
  const onErrorRef = useRef(onError);
  onCountRef.current = onCount;
  onErrorRef.current = onError;

  useEffect(() => {
    if (status !== 'authenticated' || !session?.accessToken) {
      return;
    }

    const token = session.accessToken as string;
    const controller = new AbortController();
    let cancelled = false;
    let attempt = 0;

    const connect = async () => {
      while (!cancelled && attempt < 8) {
        try {
          await subscribeUnreadCountStream(
            token,
            (c) => onCountRef.current(c),
            controller.signal
          );
        } catch (e) {
          if (controller.signal.aborted) return;
          onErrorRef.current?.(e instanceof Error ? e : new Error(String(e)));
        }
        if (cancelled || controller.signal.aborted) return;
        attempt += 1;
        const delay = Math.min(3000 * attempt, 30000);
        await new Promise((r) => setTimeout(r, delay));
      }
    };

    void connect();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [status, session?.accessToken]);
}
