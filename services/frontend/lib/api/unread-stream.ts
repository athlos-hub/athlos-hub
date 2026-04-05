import { getNotificationsGatewayBase } from '@/lib/notifications-gateway';

/**
 * Consome GET /notifications/unread-count/stream (SSE) com Authorization Bearer.
 * EventSource nativo não envia Bearer; usamos fetch + ReadableStream.
 */
export async function subscribeUnreadCountStream(
  token: string,
  onCount: (count: number) => void,
  signal: AbortSignal,
  onConnected?: () => void
): Promise<void> {
  const base = getNotificationsGatewayBase().replace(/\/$/, '');
  const res = await fetch(`${base}/notifications/unread-count/stream`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  onConnected?.();
  const reader = res.body?.getReader();
  if (!reader) throw new Error('Resposta sem corpo');
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
      if (dataLine) {
        try {
          const { count } = JSON.parse(dataLine.slice(6)) as { count: number };
          if (typeof count === 'number') onCount(count);
        } catch {
          /* ignora chunk inválido */
        }
      }
    }
  }
}
