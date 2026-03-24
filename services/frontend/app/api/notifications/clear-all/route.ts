import { NextResponse } from 'next/server';
import axios from 'axios';
import { notificationsUpstreamAuth, getNotificationsGatewayUrl } from '@/lib/server/notifications-upstream';

export async function DELETE() {
  const auth = await notificationsUpstreamAuth();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const response = await axios.delete(`${getNotificationsGatewayUrl()}/notifications/clear-all`, {
      headers: auth.headers,
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: unknown; status?: number } };
    return NextResponse.json(
      {
        error: err.response?.data ?? err.message ?? 'Erro ao limpar notificações',
        status: err.response?.status,
      },
      { status: err.response?.status || 500 }
    );
  }
}
