"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { subscribeUnreadCountStream } from '@/lib/api/unread-stream';

type Options = {
  onCount: (count: number) => void;
  onError?: (err: Error) => void;
  enabled?: boolean;
};

/** Só zera o contador de backoff após a conexão permanecer aberta este tempo (evita flap sem pausa). */
const STABLE_CONNECTED_MS = 30_000;

/**
 * Mantém SSE da contagem de não lidas com Bearer (fetch stream), com reconexão simples.
 */
export function useUnreadCountSse({ onCount, onError, enabled = true }: Options) {
  const { data: session, status } = useSession();
  const onCountRef = useRef(onCount);
  const onErrorRef = useRef(onError);
  onCountRef.current = onCount;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (status !== 'authenticated' || !session?.accessToken) {
      return;
    }

    const token = session.accessToken as string;
    const controller = new AbortController();
    let cancelled = false;
    let attempt = 0;
    let streamOpenedAt: number | null = null;

    const finalizeStreamAttempt = (bumpIfNeverOpened: boolean) => {
      if (streamOpenedAt !== null) {
        const elapsed = Date.now() - streamOpenedAt;
        streamOpenedAt = null;
        if (elapsed >= STABLE_CONNECTED_MS) {
          attempt = 0;
        } else {
          attempt = Math.min(attempt + 1, 8);
        }
      } else if (bumpIfNeverOpened) {
        attempt = Math.min(attempt + 1, 8);
      }
    };

    const connect = async () => {
      while (!cancelled) {
        try {
          streamOpenedAt = null;
          await subscribeUnreadCountStream(
            token,
            (c) => onCountRef.current(c),
            controller.signal,
            () => {
              streamOpenedAt = Date.now();
            }
          );
          finalizeStreamAttempt(false);
        } catch (e) {
          if (controller.signal.aborted) return;
          onErrorRef.current?.(e instanceof Error ? e : new Error(String(e)));
          finalizeStreamAttempt(true);
          const delay =
            attempt > 0 ? Math.min(3000 * attempt, 30000) : 2000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        if (cancelled || controller.signal.aborted) return;
        const delay =
          attempt > 0 ? Math.min(3000 * attempt, 30000) : 2000;
        await new Promise((r) => setTimeout(r, delay));
      }
    };

    void connect();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, status, session?.accessToken]);
}
