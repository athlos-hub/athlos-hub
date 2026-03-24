import { NextResponse } from 'next/server';
import axios from 'axios';
import { notificationsUpstreamAuth, getNotificationsGatewayUrl } from '@/lib/server/notifications-upstream';

export async function GET() {
  const auth = await notificationsUpstreamAuth();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const response = await axios.get(`${getNotificationsGatewayUrl()}/notifications/unread-count`, {
      headers: auth.headers,
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number } };
    console.error('Erro ao contar notificações:', error);
    return NextResponse.json(
      { error: err.message || 'Erro ao contar notificações' },
      { status: err.response?.status || 500 }
    );
  }
}
