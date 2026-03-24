import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_GATEWAY_URL = process.env.API_BASE_URL || 'http://localhost:8100/api/v1';

export function getNotificationsGatewayUrl(): string {
  return API_GATEWAY_URL.replace(/\/$/, '');
}

type NotificationsUpstreamAuthResult =
  | { ok: true; headers: Record<string, string> }
  | { ok: false; response: NextResponse };

/** Headers para chamar o serviço de notificações no Kong com o JWT do utilizador. */
export async function notificationsUpstreamAuth(): Promise<NotificationsUpstreamAuthResult> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    };
  }
  return {
    ok: true,
    headers: { Authorization: `Bearer ${token}` },
  };
}
