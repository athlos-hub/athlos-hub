import { NextResponse } from 'next/server';
import axios from 'axios';
import { notificationsUpstreamAuth, getNotificationsGatewayUrl } from '@/lib/server/notifications-upstream';

export async function POST() {
  const auth = await notificationsUpstreamAuth();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const response = await axios.post(
      `${getNotificationsGatewayUrl()}/notifications/mark-all-read`,
      {},
      { headers: auth.headers }
    );

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number } };
    console.error('Erro ao marcar notificações como lidas:', error);
    return NextResponse.json(
      { error: err.message || 'Erro ao marcar notificações' },
      { status: err.response?.status || 500 }
    );
  }
}
