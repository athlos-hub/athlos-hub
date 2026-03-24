import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { notificationsUpstreamAuth, getNotificationsGatewayUrl } from '@/lib/server/notifications-upstream';

export async function GET(request: NextRequest) {
  const auth = await notificationsUpstreamAuth();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '50';
    const unreadOnly = searchParams.get('unread_only') === 'true';

    const response = await axios.get(`${getNotificationsGatewayUrl()}/notifications`, {
      params: {
        page,
        page_size: pageSize,
        unread_only: unreadOnly,
      },
      headers: auth.headers,
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number } };
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json(
      { error: err.message || 'Erro ao buscar notificações' },
      { status: err.response?.status || 500 }
    );
  }
}
