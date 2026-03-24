import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { notificationsUpstreamAuth, getNotificationsGatewayUrl } from '@/lib/server/notifications-upstream';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await notificationsUpstreamAuth();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await params;

    const response = await axios.post(
      `${getNotificationsGatewayUrl()}/notifications/${id}/mark-read`,
      {},
      { headers: auth.headers }
    );

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number } };
    console.error('Erro ao marcar notificação como lida:', error);
    return NextResponse.json(
      { error: err.message || 'Erro ao marcar notificação' },
      { status: err.response?.status || 500 }
    );
  }
}
